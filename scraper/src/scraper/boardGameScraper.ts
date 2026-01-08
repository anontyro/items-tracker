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
  options?: { maxAttempts?: number; baseDelayMs?: number }
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
          "Failed to navigate after maximum attempts; giving up on further pages"
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
        "Navigation failed; will retry after backoff"
      );

      const backoffMs = baseDelayMs * Math.pow(2, attempt - 1);
      await page.waitForTimeout(backoffMs);
    }
  }
}

export async function scrapeSiteWithPlaywright(
  siteConfig: SiteConfig,
  logger: pino.Logger,
  options?: { maxPages?: number }
): Promise<ScrapedProduct[]> {
  const headlessEnv = process.env.PLAYWRIGHT_HEADLESS;
  const headless =
    headlessEnv === "false" || headlessEnv === "0" ? false : true;

  const browser = await chromium.launch({ headless });

  const userAgent =
    process.env.PLAYWRIGHT_USER_AGENT ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const context = await browser.newContext({ userAgent });
  const page = await context.newPage();

  const results: ScrapedProduct[] = [];
  const maxPages = options?.maxPages;
  const hasMaxPages = typeof maxPages === "number" && maxPages > 0;
  let currentPage = 1;
  let nextUrl: string | null = siteConfig.listPageUrl;

  try {
    while (nextUrl && (!hasMaxPages || currentPage <= maxPages)) {
      logger.info(
        { siteId: siteConfig.siteId, page: currentPage, url: nextUrl },
        "Scraping product list page"
      );

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
          "Timed out waiting for productList selector; continuing to count anyway"
        );
      }

      // Debug: dump first page HTML to disk so we can inspect real markup if selectors return 0
      if (currentPage === 1) {
        const html = await page.content();
        const dumpPath = path.resolve(
          process.cwd(),
          `debug-${siteConfig.siteId}-page-${currentPage}.html`
        );
        await fs.writeFile(dumpPath, html, "utf8");
        logger.info(
          { siteId: siteConfig.siteId, page: currentPage, dumpPath },
          "Wrote debug HTML dump for page"
        );
      }

      const productLocator = page.locator(siteConfig.selectors.productList);
      const productCount = await productLocator.count();

      logger.info(
        {
          siteId: siteConfig.siteId,
          page: currentPage,
          productCount,
        },
        "Found products on page"
      );

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
          siteConfig.selectors.productAvailability
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

        results.push({
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
        });
      }

      const paginationLocator = page.locator(siteConfig.paginationSelector);
      const paginationLinkCount = await paginationLocator.count();
      let nextHref: string | null = null;

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

      if (!nextHref) {
        break;
      }

      nextUrl =
        nextHref.startsWith("http://") || nextHref.startsWith("https://")
          ? nextHref
          : new URL(nextHref, siteConfig.baseUrl).toString();

      currentPage += 1;
      await page.waitForTimeout(siteConfig.rateLimitMs);
    }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  return results;
}
