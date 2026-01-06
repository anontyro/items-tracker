import { SiteConfig } from "../config/siteConfig";
import { chromium } from "playwright";
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

export async function scrapeSiteWithPlaywright(
  siteConfig: SiteConfig,
  logger: pino.Logger,
  options?: { maxPages?: number }
): Promise<ScrapedProduct[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

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

      await page.goto(nextUrl, { waitUntil: "networkidle" });

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
    await browser.close();
  }

  return results;
}
