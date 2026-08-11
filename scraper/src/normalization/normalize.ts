import { RawScrapedProductRow } from "../storage/sqlite";
import { ScrapedProduct } from "../scraper/boardGameScraper";
import { SiteConfig } from "../config/siteConfig";

export interface NormalizedProductIdentity {
  name: string;
  type: string; // e.g. "board-game"
}

export interface NormalizedProductSourceInput {
  sourceName: string; // e.g. "Board Game Co UK"
  sourceUrl: string;
  sku: string | null;
  additionalData: Record<string, unknown>;
}

export interface NormalizedPriceHistoryInput {
  product: NormalizedProductIdentity;
  source: NormalizedProductSourceInput;
  price: number;
  rrp: number | null;
  availability: boolean | null;
  isPreorder: boolean | null;
  currencyCode: string | null; // ISO 4217 where possible, e.g. "GBP"
  scrapedAt: string; // ISO timestamp
}

function deriveAvailabilityFlag(
  availabilityText: string | null,
): boolean | null {
  if (!availabilityText) {
    return null;
  }

  const text = availabilityText.toLowerCase();

  // Heuristics tailored to board-game.co.uk but generally safe:
  if (text.includes("in stock")) {
    return true;
  }

  // Pre-order items (e.g. chaos-cards) are purchasable, so treat them as
  // available even though they aren't "in stock" yet.
  if (text.includes("pre-order") || text.includes("preorder")) {
    return true;
  }

  if (text.includes("out of stock") || text.includes("restock")) {
    return false;
  }

  return null;
}

function derivePreorderFlag(availabilityText: string | null): boolean | null {
  if (!availabilityText) {
    return null;
  }

  const text = availabilityText.toLowerCase();
  return text.includes("pre-order") || text.includes("preorder");
}

function deriveCurrencyCode(
  priceText: string | null | undefined,
): string | null {
  if (!priceText) {
    return null;
  }

  const text = priceText.trim().toLowerCase();

  if (text.includes("£")) {
    return "GBP";
  }

  if (text.includes("€")) {
    return "EUR";
  }

  if (text.includes("$") || text.includes("usd")) {
    return "USD";
  }

  if (text.includes("gbp")) {
    return "GBP";
  }

  if (text.includes("eur")) {
    return "EUR";
  }

  return null;
}

export function normalizeRowsForSite(
  siteConfig: SiteConfig,
  rows: RawScrapedProductRow[],
): NormalizedPriceHistoryInput[] {
  const productIdentity: NormalizedProductIdentity = {
    name: "", // filled per-row from scraped data
    type: siteConfig.itemType,
  };

  return rows
    .filter((row) => row.price != null && row.url != null && row.name != null)
    .map((row) => {
      const availability = deriveAvailabilityFlag(row.availability_text);
      const isPreorder = derivePreorderFlag(row.availability_text);
      const currencyCode = deriveCurrencyCode(
        row.price_text ?? row.rrp_text ?? undefined,
      );

      let imageUrl: string | null = null;
      try {
        const parsed = JSON.parse(row.raw_json) as {
          imageUrl?: string | null;
        } | null;
        if (parsed && typeof parsed.imageUrl === "string") {
          imageUrl = parsed.imageUrl;
        }
      } catch {
        // Ignore JSON parse errors; imageUrl will remain null.
      }

      const product: NormalizedProductIdentity = {
        ...productIdentity,
        name: row.name ?? "",
      };

      const source: NormalizedProductSourceInput = {
        sourceName: siteConfig.siteName,
        sourceUrl: row.url ?? "",
        sku: row.sku,
        additionalData: {
          siteId: row.site_id,
          sourceProductId: row.source_product_id,
          priceText: row.price_text,
          rrpText: row.rrp_text,
          availabilityText: row.availability_text,
          imageUrl,
          productPageUrl: row.url,
        },
      };

      return {
        product,
        source,
        price: row.price as number,
        rrp: row.rrp,
        availability,
        isPreorder,
        currencyCode,
        scrapedAt: row.scraped_at,
      };
    });
}

// Normalizes a single in-memory page of `ScrapedProduct[]` directly,
// without a round trip through sqlite — used for incremental per-page
// backend pushes. Delegates to `normalizeRowsForSite` via a thin adapter so
// filtering/derivation logic is never forked between the per-page path and
// the (legacy, whole-run) raw-row path.
export function normalizeScrapedProducts(
  siteConfig: SiteConfig,
  products: ScrapedProduct[],
  scrapedAtIso: string,
): NormalizedPriceHistoryInput[] {
  const rows: RawScrapedProductRow[] = products.map((p) => ({
    id: 0,
    site_id: p.siteId,
    source_product_id: p.sourceProductId,
    name: p.name,
    url: p.url,
    price: p.price,
    price_text: p.priceText,
    rrp: p.rrp,
    rrp_text: p.rrpText,
    availability_text: p.availabilityText,
    sku: p.sku,
    raw_json: JSON.stringify(p),
    scraped_at: scrapedAtIso,
  }));

  return normalizeRowsForSite(siteConfig, rows);
}
