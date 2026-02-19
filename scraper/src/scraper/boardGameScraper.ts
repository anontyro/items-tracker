import { Page, chromium } from "playwright";

import { SiteConfig } from "../config/siteConfig";
import fs from "fs/promises";
import path from "path";
import pino from "pino";

export interface ScrapedProduct {
  siteId: string;
  sourceProductId: string | null;
  name: string;
  url: string;
  price: number | null;
  priceText: string | null;
  rrp: number | null;
  rrpText: string | null;
  availabilityText: string | null;
  sku: string | null;
  imageUrl: string | null;
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/£|,/g, "");
  const match = cleaned.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

async function gotoWithRetry(
  page: Page,
  url: string,
  logger: pino.Logger,
  meta: { siteId: string; page: number },
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<void> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 5_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      return;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown navigation error";

      if (attempt >= maxAttempts) {
        logger.error(
          {
            siteId: meta.siteId,
            page: meta.page,
            url,
            attempt,
            maxAttempts,
            err: errorMessage,
          },
          "Failed to navigate after maximum attempts; giving up on further pages",
        );
        throw err;
      }

      logger.warn(
        {
          siteId: meta.siteId,
          page: meta.page,
          url,
          attempt,
          maxAttempts,
          err: errorMessage,
        },
        "Navigation failed; will retry after backoff",
      );

      const backoffMs = baseDelayMs * Math.pow(2, attempt - 1);
      await page.waitForTimeout(backoffMs);
    }
  }
}

export async function* scrapeSiteWithPlaywright(
  siteConfig: SiteConfig,
  logger: pino.Logger,
  options?: {
    maxPages?: number;
    startPage?: number;
    enableDetailImages?: boolean;
  },
): AsyncGenerator<ScrapedProduct[], void, void> {
  const headlessEnv = process.env.PLAYWRIGHT_HEADLESS;
  const headless =
    headlessEnv === "false" || headlessEnv === "0" ? false : true;

  const browser = await chromium.launch({ headless });

  const userAgent =
    process.env.PLAYWRIGHT_USER_AGENT ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const context = await browser.newContext({ userAgent });
  const page = await context.newPage();

  const maxPages = options?.maxPages;
  const hasMaxPages = typeof maxPages === "number" && maxPages > 0;
  const rawStartPage = options?.startPage;
  const startPage =
    typeof rawStartPage === "number" && rawStartPage > 0
      ? Math.floor(rawStartPage)
      : 1;
  let currentPage = 1;
  let nextUrl: string | null = siteConfig.listPageUrl;
  const visitedListPageUrls = new Set<string>();
  // For some Shopify-based sites (like clownfish-games), the visible pagination
  // controls can loop between a small set of URLs even though many more pages
  // exist. For those cases we derive the total page count from the "X products"
  // text and then drive pagination purely via the ?page=N query parameter.
  let derivedTotalPages: number | null = null;

  try {
    while (nextUrl && (!hasMaxPages || currentPage <= maxPages)) {
      logger.info(
        { siteId: siteConfig.siteId, page: currentPage, url: nextUrl },
        "Scraping product list page",
      );

      // Guard against accidental pagination loops (e.g. bouncing between
      // the same two list URLs). If we've already seen this URL, stop.
      if (visitedListPageUrls.has(nextUrl)) {
        logger.warn(
          { siteId: siteConfig.siteId, page: currentPage, url: nextUrl },
          "Detected previously visited list page URL; stopping pagination to avoid loop",
        );
        break;
      }
      visitedListPageUrls.add(nextUrl);

      try {
        await gotoWithRetry(page, nextUrl, logger, {
          siteId: siteConfig.siteId,
          page: currentPage,
        });
      } catch {
        // If navigation keeps failing even after retries, stop pagination but
        // return any products that were successfully scraped from previous pages.
        break;
      }

      // Wait explicitly for the product list selector, in case content is loaded asynchronously
      try {
        await page.waitForSelector(siteConfig.selectors.productList, {
          timeout: 10000,
        });
      } catch {
        logger.warn(
          { siteId: siteConfig.siteId, page: currentPage },
          "Timed out waiting for productList selector; continuing to count anyway",
        );
      }

      // Debug: dump first page HTML to disk so we can inspect real markup if selectors return 0
      if (currentPage === 1) {
        const html = await page.content();
        const dumpPath = path.resolve(
          process.cwd(),
          `debug-${siteConfig.siteId}-page-${currentPage}.html`,
        );
        await fs.writeFile(dumpPath, html, "utf8");
        logger.info(
          { siteId: siteConfig.siteId, page: currentPage, dumpPath },
          "Wrote debug HTML dump for page",
        );
      }

      const productLocator = page.locator(siteConfig.selectors.productList);
      const productCount = await productLocator.count();

      const pageResults: ScrapedProduct[] = [];

      logger.info(
        {
          siteId: siteConfig.siteId,
          page: currentPage,
          productCount,
        },
        "Found products on page",
      );

      // For clownfish-games specifically, attempt to derive the total number of
      // pages from the "X products" text. Once we know how many products exist
      // and how many we see per page, we can step page=1..N directly without
      // relying on potentially confusing pagination controls.
      if (
        siteConfig.siteId === "clownfish-games" &&
        derivedTotalPages === null &&
        productCount > 0
      ) {
        try {
          const totalCountLocator = page.locator("#ProductCountDesktop");
          if (await totalCountLocator.count()) {
            const totalText = (await totalCountLocator.textContent()) ?? "";
            // e.g. "1169 products"
            const match = totalText.match(/(\d[\d,]*)\s+products/i);
            if (match) {
              const totalRaw = match[1].replace(/,/g, "");
              const total = Number(totalRaw);
              if (Number.isFinite(total) && total > 0) {
                const pages = Math.ceil(total / productCount);
                if (pages > 0) {
                  derivedTotalPages = pages;
                  logger.info(
                    {
                      siteId: siteConfig.siteId,
                      totalProducts: total,
                      productsPerPage: productCount,
                      derivedTotalPages: pages,
                    },
                    "Derived total pages for site from product count",
                  );
                }
              }
            }
          }
        } catch {
          // If this heuristic fails, we'll fall back to generic pagination
          // handling below.
        }
      }

      if (currentPage >= startPage) {
        for (let index = 0; index < productCount; index += 1) {
          const item = productLocator.nth(index);

          const sourceProductId = await item.getAttribute("data-product-id");

          const nameElement = item.locator(siteConfig.selectors.productName);
          const nameText = (await nameElement.textContent()) ?? "";
          const name = nameText.trim();

          const href = (await nameElement.getAttribute("href")) ?? "";
          const absoluteUrl =
            href.startsWith("http://") || href.startsWith("https://")
              ? href
              : new URL(href, siteConfig.baseUrl).toString();

          const priceBox = item.locator(siteConfig.selectors.productPrice);
          const priceAttr = await priceBox.getAttribute("data-now");
          const priceText = (await priceBox.textContent())?.trim() ?? null;
          const price = priceAttr ? Number(priceAttr) : parseNumber(priceText);

          let rrp: number | null = null;
          let rrpText: string | null = null;
          const rrpBox = item.locator(siteConfig.selectors.productRrp);
          if (await rrpBox.count()) {
            const rrpAttr = await rrpBox.getAttribute("data-was");
            rrpText = (await rrpBox.textContent())?.trim() ?? null;
            rrp = rrpAttr ? Number(rrpAttr) : parseNumber(rrpText);
          }

          let availabilityText: string | null = null;
          const availabilityElement = item.locator(
            siteConfig.selectors.productAvailability,
          );
          if (await availabilityElement.count()) {
            availabilityText =
              (await availabilityElement.textContent())?.trim() ?? null;
          }

          let sku: string | null = null;
          const skuElement = item
            .locator(siteConfig.selectors.productSku)
            .first();
          if (await skuElement.count()) {
            sku = (await skuElement.getAttribute("data-sku")) ?? null;
          }

          let imageUrl: string | null = null;

          const listImageSelector = siteConfig.selectors.productImageList;
          if (listImageSelector) {
            const imgElement = item.locator(listImageSelector).first();
            if (await imgElement.count()) {
              const srcAttr =
                (await imgElement.getAttribute("data-src")) ??
                (await imgElement.getAttribute("src"));
              if (srcAttr) {
                imageUrl =
                  srcAttr.startsWith("http://") ||
                  srcAttr.startsWith("https://")
                    ? srcAttr
                    : new URL(srcAttr, siteConfig.baseUrl).toString();
              }
            }
          }

          if (
            options?.enableDetailImages &&
            siteConfig.followProductPageForImage
          ) {
            const detailSelector = siteConfig.selectors.productImageDetail;
            if (detailSelector) {
              const detailPage = await context.newPage();
              try {
                await detailPage.goto(absoluteUrl, {
                  waitUntil: "domcontentloaded",
                  timeout: 15000,
                });

                const detailImg = detailPage.locator(detailSelector).first();
                if (await detailImg.count()) {
                  const srcAttr =
                    (await detailImg.getAttribute("data-src")) ??
                    (await detailImg.getAttribute("src"));
                  if (srcAttr) {
                    const abs =
                      srcAttr.startsWith("http://") ||
                      srcAttr.startsWith("https://")
                        ? srcAttr
                        : new URL(srcAttr, siteConfig.baseUrl).toString();
                    imageUrl = abs;
                  }
                }
              } catch (err) {
                const message =
                  err instanceof Error
                    ? err.message
                    : "Unknown error while scraping detail image";
                logger.warn(
                  {
                    siteId: siteConfig.siteId,
                    page: currentPage,
                    url: absoluteUrl,
                    err: message,
                  },
                  "Failed to scrape image from product detail page; using list image if available",
                );
              } finally {
                await detailPage.close();
              }
            }
          }

          pageResults.push({
            siteId: siteConfig.siteId,
            sourceProductId,
            name,
            url: absoluteUrl,
            price,
            priceText,
            rrp,
            rrpText,
            availabilityText,
            sku,
            imageUrl,
          });
        }

        if (pageResults.length) {
          yield pageResults;
        }
      }

      // Special-case clownfish-games: if we successfully derived a total page
      // count, drive pagination by incrementing the ?page=N query parameter
      // directly instead of relying on potentially looping pagination links.
      if (
        siteConfig.siteId === "clownfish-games" &&
        derivedTotalPages &&
        currentPage < derivedTotalPages
      ) {
        try {
          const baseUrl = new URL(nextUrl, siteConfig.baseUrl);
          const nextPageNum = currentPage + 1;
          baseUrl.searchParams.set("page", String(nextPageNum));
          const candidateNextUrl = baseUrl.toString();

          if (visitedListPageUrls.has(candidateNextUrl)) {
            logger.warn(
              {
                siteId: siteConfig.siteId,
                page: currentPage,
                nextUrl: candidateNextUrl,
              },
              "Next derived pagination URL has already been visited; stopping pagination",
            );
            break;
          }

          nextUrl = candidateNextUrl;
          currentPage += 1;
          await page.waitForTimeout(siteConfig.rateLimitMs);
          continue;
        } catch {
          // If URL manipulation fails for some reason, fall through to generic
          // pagination logic below.
        }
      }

      const paginationLocator = page.locator(siteConfig.paginationSelector);
      const paginationLinkCount = await paginationLocator.count();
      let nextHref: string | null = null;

      // First, try legacy behaviour: look for a link with a data-page attribute
      // equal to the next page number. This supports older site configs.
      for (let i = 0; i < paginationLinkCount; i += 1) {
        const link = paginationLocator.nth(i);
        const pageAttr = await link.getAttribute("data-page");
        if (pageAttr === String(currentPage + 1)) {
          const hrefValue = await link.getAttribute("href");
          if (hrefValue) {
            nextHref = hrefValue;
          }
          break;
        }
      }

      // If we still don't have a nextHref, try to infer the next page by
      // inspecting numeric page numbers from the pagination links themselves
      // (e.g. Shopify-style ?page=N URLs). We pick the smallest page number
      // greater than the current page.
      if (!nextHref && paginationLinkCount > 0) {
        type PageCandidate = { pageNum: number; href: string };
        const candidates: PageCandidate[] = [];

        for (let i = 0; i < paginationLinkCount; i += 1) {
          const link = paginationLocator.nth(i);
          const hrefValue = await link.getAttribute("href");
          if (!hrefValue) continue;

          let pageNum: number | null = null;

          const pageAttr = await link.getAttribute("data-page");
          if (pageAttr && /^\d+$/.test(pageAttr)) {
            pageNum = Number(pageAttr);
          } else {
            try {
              const urlObj = new URL(hrefValue, siteConfig.baseUrl);
              const qp = urlObj.searchParams.get("page");
              if (qp && /^\d+$/.test(qp)) {
                pageNum = Number(qp);
              }
            } catch {
              // Ignore malformed URLs and keep scanning.
            }
          }

          if (pageNum !== null && pageNum > currentPage) {
            candidates.push({ pageNum, href: hrefValue });
          }
        }

        if (candidates.length > 0) {
          candidates.sort((a, b) => a.pageNum - b.pageNum);
          nextHref = candidates[0].href;
        }
      }

      // If no numeric page could be determined, fall back to detecting an
      // explicit "next" link via rel / class / text hints.
      if (!nextHref && paginationLinkCount > 0) {
        for (let i = 0; i < paginationLinkCount; i += 1) {
          const link = paginationLocator.nth(i);
          const rel = (await link.getAttribute("rel")) ?? "";
          const className = (await link.getAttribute("class")) ?? "";
          const text = (await link.textContent())?.trim() ?? "";
          const ariaLabel = (await link.getAttribute("aria-label")) ?? "";

          const isNextLink =
            rel === "next" ||
            className.includes("pagination__item--next") ||
            /^next$/i.test(text) ||
            /next page/i.test(ariaLabel);

          if (isNextLink) {
            const hrefValue = await link.getAttribute("href");
            if (hrefValue) {
              nextHref = hrefValue;
            }
            break;
          }
        }
      }

      if (!nextHref) {
        break;
      }

      const candidateNextUrl =
        nextHref.startsWith("http://") || nextHref.startsWith("https://")
          ? nextHref
          : new URL(nextHref, siteConfig.baseUrl).toString();

      // If following this next URL would send us back to a page we've already
      // scraped, stop instead of entering a pagination loop.
      if (visitedListPageUrls.has(candidateNextUrl)) {
        logger.warn(
          {
            siteId: siteConfig.siteId,
            page: currentPage,
            nextUrl: candidateNextUrl,
          },
          "Next pagination URL has already been visited; stopping pagination",
        );
        break;
      }

      nextUrl = candidateNextUrl;

      currentPage += 1;
      await page.waitForTimeout(siteConfig.rateLimitMs);
    }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}
