import { BrowserContext, Page, chromium } from "playwright";
import { ScrapeRunStats, recordIssue } from "./scrapeStats";

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

// Constructs a direct URL for a given page number from a site's
// `pageUrlTemplate` (a "{page}" placeholder). Page 1 always uses
// `listPageUrl` verbatim, since some sites' page-1 URL has no "?page=1" /
// "/page/1" suffix at all.
function buildPageUrl(siteConfig: SiteConfig, pageNum: number): string {
  if (pageNum <= 1 || !siteConfig.pageUrlTemplate) {
    return siteConfig.listPageUrl;
  }
  return siteConfig.pageUrlTemplate.replace("{page}", String(pageNum));
}

interface TotalsEstimate {
  totalPagesEstimate: number | null;
  totalProductsEstimate: number | null;
}

// Estimates how many pages/products a site's listing has, for progress
// logging. Two independent strategies, tried in order:
//
// 1. Scan the pagination controls for the highest numeric page indicator
//    (query param, `data-page` attribute, or "/page/N" path segment) —
//    zero-config, works for any site whose pagination nav exposes numbered
//    links (Shopify-style `?page=N`, chaos-cards' `/page/N`, etc). Skipped
//    entirely for "template"-mode sites: their own DOM pagination controls
//    may expose a numeric-looking attribute that belongs to a completely
//    different, incompatible addressing scheme (e.g. magic-mad-house's
//    click-widget `data-offset` is on a 12-items/page scheme, unrelated to
//    the 24-items/page `pageUrlTemplate` scheme actually being used) —
//    scanning it would produce a misleading total.
// 2. Fall back to `siteConfig.totalCountSelector`, an element whose text
//    contains a literal "X results/products" style count, for sites with no
//    discoverable numbered links (or where (1) is skipped).
async function deriveTotals(
  page: Page,
  siteConfig: SiteConfig,
  productsOnPage: number,
): Promise<TotalsEstimate> {
  if (productsOnPage <= 0) {
    return { totalPagesEstimate: null, totalProductsEstimate: null };
  }

  if (siteConfig.paginationMode !== "template" && siteConfig.paginationSelector) {
    const paginationLocator = page.locator(siteConfig.paginationSelector);
    const linkCount = await paginationLocator.count();
    let maxPageNum: number | null = null;

    for (let i = 0; i < linkCount; i += 1) {
      const link = paginationLocator.nth(i);
      let pageNum: number | null = null;

      const pageAttr = await link.getAttribute("data-page");
      if (pageAttr && /^\d+$/.test(pageAttr)) {
        pageNum = Number(pageAttr);
      } else {
        const hrefValue = await link.getAttribute("href");
        if (hrefValue) {
          try {
            const urlObj = new URL(hrefValue, siteConfig.baseUrl);
            const qp =
              urlObj.searchParams.get("page") ?? urlObj.searchParams.get("Page");
            if (qp && /^\d+$/.test(qp)) {
              pageNum = Number(qp);
            } else {
              const segMatch = hrefValue.match(/\/page\/(\d+)/i);
              if (segMatch) {
                pageNum = Number(segMatch[1]);
              }
            }
          } catch {
            // Ignore malformed hrefs and keep scanning.
          }
        }
      }

      if (pageNum !== null && (maxPageNum === null || pageNum > maxPageNum)) {
        maxPageNum = pageNum;
      }
    }

    if (maxPageNum !== null) {
      return {
        totalPagesEstimate: maxPageNum,
        totalProductsEstimate: maxPageNum * productsOnPage,
      };
    }
  }

  if (siteConfig.totalCountSelector) {
    try {
      const totalLocator = page.locator(siteConfig.totalCountSelector);
      if (await totalLocator.count()) {
        const totalText = (await totalLocator.first().textContent()) ?? "";
        const match = totalText.match(/(\d[\d,]*)/);
        if (match) {
          const total = Number(match[1].replace(/,/g, ""));
          if (Number.isFinite(total) && total > 0) {
            return {
              totalPagesEstimate: Math.ceil(total / productsOnPage),
              totalProductsEstimate: total,
            };
          }
        }
      }
    } catch {
      // Ignore selector errors; fall through to "unknown".
    }
  }

  return { totalPagesEstimate: null, totalProductsEstimate: null };
}

async function gotoWithRetry(
  page: Page,
  url: string,
  logger: pino.Logger,
  meta: { siteId: string; page: number },
  options?: { maxAttempts?: number; baseDelayMs?: number },
  stats?: ScrapeRunStats,
): Promise<void> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 5_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
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
        recordIssue(stats, {
          type: "navigation_failed",
          page: meta.page,
          message: `Navigation to ${url} failed after ${maxAttempts} attempts: ${errorMessage}`,
        });
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
      recordIssue(stats, {
        type: "navigation_retry",
        page: meta.page,
        message: `Navigation to ${url} failed on attempt ${attempt}/${maxAttempts}: ${errorMessage}`,
      });

      const backoffMs = baseDelayMs * Math.pow(2, attempt - 1);
      await page.waitForTimeout(backoffMs);
    }
  }
}

async function extractProductsFromPage(
  page: Page,
  context: BrowserContext,
  siteConfig: SiteConfig,
  logger: pino.Logger,
  currentPage: number,
  enableDetailImages: boolean | undefined,
  stats?: ScrapeRunStats,
): Promise<ScrapedProduct[]> {
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

  for (let index = 0; index < productCount; index += 1) {
    const item = productLocator.nth(index);

    const sourceProductId = await item.getAttribute("data-product-id");

    const nameElement = item.locator(siteConfig.selectors.productName);
    const titleAttr = (await nameElement.getAttribute("title"))?.trim();
    const nameText = titleAttr || ((await nameElement.textContent()) ?? "");
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
    const skuElement = item.locator(siteConfig.selectors.productSku).first();
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
            srcAttr.startsWith("http://") || srcAttr.startsWith("https://")
              ? srcAttr
              : new URL(srcAttr, siteConfig.baseUrl).toString();
        }
      }
    }

    if (enableDetailImages && siteConfig.followProductPageForImage) {
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
                srcAttr.startsWith("http://") || srcAttr.startsWith("https://")
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
          recordIssue(stats, {
            type: "detail_image_failed",
            page: currentPage,
            message: `${absoluteUrl}: ${message}`,
          });
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

  return pageResults;
}

export async function* scrapeSiteWithPlaywright(
  siteConfig: SiteConfig,
  logger: pino.Logger,
  options?: {
    maxPages?: number;
    startPage?: number;
    enableDetailImages?: boolean;
    stats?: ScrapeRunStats;
  },
): AsyncGenerator<ScrapedProduct[], void, void> {
  const stats = options?.stats;
  const headlessEnv = process.env.PLAYWRIGHT_HEADLESS;
  const headless =
    headlessEnv === "false" || headlessEnv === "0" ? false : true;

  const browser = await chromium.launch({ headless });

  const userAgent =
    process.env.PLAYWRIGHT_USER_AGENT ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  let context = await browser.newContext({ userAgent });
  let page = await context.newPage();

  const maxPages = options?.maxPages;
  const hasMaxPages = typeof maxPages === "number" && maxPages > 0;
  const rawStartPage = options?.startPage;
  const startPage =
    typeof rawStartPage === "number" && rawStartPage > 0
      ? Math.floor(rawStartPage)
      : 1;
  const isClickPagination = siteConfig.paginationMode === "click";
  const isTemplatePagination = siteConfig.paginationMode === "template";
  // Click-mode has no URL to jump to (its "next" state is purely in-page JS
  // state reached by walking clicks sequentially) — resuming such a site
  // always has to replay from page 1. Every other mode can jump straight to
  // a resumed startPage if a pageUrlTemplate is configured, avoiding the
  // navigation cost of walking every earlier page again.
  const canJumpToStartPage = !isClickPagination && Boolean(siteConfig.pageUrlTemplate);

  let currentPage = startPage > 1 && canJumpToStartPage ? startPage : 1;
  let nextUrl: string | null =
    currentPage > 1 ? buildPageUrl(siteConfig, currentPage) : siteConfig.listPageUrl;
  const visitedListPageUrls = new Set<string>();
  // Derived from the largest page seen so far and reused for progress
  // logging/reporting for the rest of the run. See `deriveTotals` above.
  // Re-derived (cheaply) whenever a later page turns out larger than any
  // page seen before — some sites' *first* page is an anomalously short one
  // (e.g. magic-mad-house's page 1 has only 12 items vs. a normal page's
  // 24), which would otherwise permanently lock in a ~2x-too-high total-page
  // estimate if we only ever derived once, from whichever page happened to
  // succeed first.
  let totalsEstimate: TotalsEstimate = {
    totalPagesEstimate: null,
    totalProductsEstimate: null,
  };
  let maxObservedPageSize = 0;

  try {
    while (nextUrl && (!hasMaxPages || currentPage <= maxPages)) {
      logger.info(
        { siteId: siteConfig.siteId, page: currentPage, url: nextUrl },
        "Scraping product list page",
      );
      if (stats) {
        stats.pagesVisited += 1;
      }

      if (isClickPagination) {
        // There's no per-page URL to navigate to; page 1 is a normal
        // navigation, and later pages are reached by clicking within the
        // loop below, so there's nothing to do here on subsequent passes.
        if (currentPage === 1) {
          try {
            await gotoWithRetry(
              page,
              nextUrl,
              logger,
              { siteId: siteConfig.siteId, page: currentPage },
              undefined,
              stats,
            );
          } catch {
            break;
          }
        }
      } else {
        // Guard against accidental pagination loops (e.g. bouncing between
        // the same two list URLs). If we've already seen this URL, stop.
        if (visitedListPageUrls.has(nextUrl)) {
          logger.warn(
            { siteId: siteConfig.siteId, page: currentPage, url: nextUrl },
            "Detected previously visited list page URL; stopping pagination to avoid loop",
          );
          recordIssue(stats, {
            type: "pagination_loop_detected",
            page: currentPage,
            message: `List page URL ${nextUrl} was already visited; stopped pagination`,
          });
          break;
        }
        visitedListPageUrls.add(nextUrl);

        if (siteConfig.freshContextPerPage && currentPage > 1) {
          await page.close();
          await context.close();
          context = await browser.newContext({ userAgent });
          page = await context.newPage();
        }

        try {
          await gotoWithRetry(
            page,
            nextUrl,
            logger,
            { siteId: siteConfig.siteId, page: currentPage },
            undefined,
            stats,
          );
        } catch {
          // If navigation keeps failing even after retries, stop pagination but
          // return any products that were successfully scraped from previous pages.
          break;
        }
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
        recordIssue(stats, {
          type: "selector_timeout",
          page: currentPage,
          message: `Timed out waiting for productList selector (${siteConfig.selectors.productList})`,
        });
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

      const productCountForDerivation = await page
        .locator(siteConfig.selectors.productList)
        .count();

      // Derive (or refine) an estimated total page/product count, used only
      // for progress logging and as a pagination fallback below. Only
      // re-attempted when this page is larger than any page seen before —
      // see the `maxObservedPageSize` comment above for why.
      if (productCountForDerivation > maxObservedPageSize) {
        maxObservedPageSize = productCountForDerivation;
        const derived = await deriveTotals(
          page,
          siteConfig,
          productCountForDerivation,
        );
        if (derived.totalPagesEstimate !== null) {
          totalsEstimate = derived;
          if (stats) {
            stats.totalPagesEstimate = derived.totalPagesEstimate;
            stats.totalProductsEstimate = derived.totalProductsEstimate;
          }
          logger.info(
            {
              siteId: siteConfig.siteId,
              totalPagesEstimate: derived.totalPagesEstimate,
              totalProductsEstimate: derived.totalProductsEstimate,
            },
            "Derived total pages/products estimate for site",
          );
        }
      }

      if (currentPage >= startPage) {
        const pageResults = await extractProductsFromPage(
          page,
          context,
          siteConfig,
          logger,
          currentPage,
          options?.enableDetailImages,
          stats,
        );

        if (stats) {
          stats.pagesExtracted += 1;
          stats.productCount += pageResults.length;
          // Absolute page number within the site's full catalog (distinct
          // from pagesExtracted, which is relative to this generator
          // invocation and resets to 1 even on a resumed run that jumps
          // straight to e.g. page 300). Callers use this for resumability
          // bookkeeping.
          stats.currentAbsolutePage = currentPage;
        }

        if (!pageResults.length) {
          recordIssue(stats, {
            type: "zero_products_on_page",
            page: currentPage,
            message: "No products extracted from this page",
          });

          // A page with zero products means we've run past the end of the
          // real result set. Some sites (e.g. Klevu-powered search UIs like
          // magic-mad-house) keep rendering a clickable "next" control and a
          // valid-looking URL well beyond the last real page of results, so
          // relying on the pagination control alone can spin forever. Treat
          // zero products as the definitive end-of-results signal and stop.
          logger.info(
            { siteId: siteConfig.siteId, page: currentPage },
            "Page yielded zero products; treating as end of results and stopping pagination",
          );
          break;
        }

        if (pageResults.length) {
          yield pageResults;
        }
      }

      if (isClickPagination) {
        const nextLocator = page.locator(siteConfig.paginationSelector);
        if ((await nextLocator.count()) === 0) {
          logger.info(
            { siteId: siteConfig.siteId, page: currentPage },
            "No click-pagination next control found; ending pagination",
          );
          break;
        }

        const firstItem = page.locator(siteConfig.selectors.productList).first();
        const beforeId = (await firstItem.count())
          ? await firstItem.getAttribute("data-id")
          : null;

        await nextLocator.first().click();

        const pollTimeoutMs = 15000;
        const pollIntervalMs = 300;
        const deadline = Date.now() + pollTimeoutMs;
        let refreshed = false;

        while (Date.now() < deadline) {
          await page.waitForTimeout(pollIntervalMs);
          const afterItem = page
            .locator(siteConfig.selectors.productList)
            .first();
          const afterId = (await afterItem.count())
            ? await afterItem.getAttribute("data-id")
            : null;
          if (afterId !== beforeId) {
            refreshed = true;
            break;
          }
        }

        if (!refreshed) {
          logger.warn(
            { siteId: siteConfig.siteId, page: currentPage },
            "Timed out waiting for click-pagination grid to refresh; ending pagination",
          );
          recordIssue(stats, {
            type: "click_pagination_timeout",
            page: currentPage,
            message: "Click-based pagination did not refresh the product grid",
          });
          break;
        }

        currentPage += 1;
        await page.waitForTimeout(siteConfig.rateLimitMs);
        continue;
      }

      if (isTemplatePagination) {
        if (!siteConfig.pageUrlTemplate) {
          // Config error: "template" mode with nothing to template from.
          // Nothing else we can do to find the next page — stop rather than
          // guessing.
          logger.warn(
            { siteId: siteConfig.siteId, page: currentPage },
            'paginationMode is "template" but no pageUrlTemplate is configured; stopping pagination',
          );
          break;
        }

        nextUrl = buildPageUrl(siteConfig, currentPage + 1);
        currentPage += 1;
        await page.waitForTimeout(siteConfig.rateLimitMs);
        continue;
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

      // If the DOM's pagination controls didn't yield a usable next link
      // (some sites' visible pagination window loops or omits the true
      // "next" link once you're deep into the catalog — this is what the
      // clownfish-games-specific handling used to work around) but we have
      // a constructible page URL and a derived total-page count, drive
      // pagination directly via the template instead of guessing further.
      if (
        !nextHref &&
        siteConfig.pageUrlTemplate &&
        totalsEstimate.totalPagesEstimate !== null &&
        currentPage < totalsEstimate.totalPagesEstimate
      ) {
        nextHref = buildPageUrl(siteConfig, currentPage + 1);
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
        recordIssue(stats, {
          type: "pagination_loop_detected",
          page: currentPage,
          message: `Next pagination URL ${candidateNextUrl} was already visited; stopped pagination`,
        });
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
