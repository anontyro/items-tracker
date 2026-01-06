import { RawScrapedProductRow } from "../storage/sqlite";
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
  currencyCode: string | null; // ISO 4217 where possible, e.g. "GBP"
  scrapedAt: string; // ISO timestamp
}

function deriveAvailabilityFlag(
  availabilityText: string | null
): boolean | null {
  if (!availabilityText) {
    return null;
  }

  const text = availabilityText.toLowerCase();

  // Heuristics tailored to board-game.co.uk but generally safe:
  if (text.includes("in stock")) {
    return true;
  }

  if (text.includes("out of stock") || text.includes("restock")) {
    return false;
  }

  return null;
}

function deriveCurrencyCode(
  priceText: string | null | undefined
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
  rows: RawScrapedProductRow[]
): NormalizedPriceHistoryInput[] {
  const productIdentity: NormalizedProductIdentity = {
    name: "", // filled per-row from scraped data
    type: siteConfig.itemType,
  };

  return rows
    .filter((row) => row.price != null && row.url != null && row.name != null)
    .map((row) => {
      const availability = deriveAvailabilityFlag(row.availability_text);
      const currencyCode = deriveCurrencyCode(
        row.price_text ?? row.rrp_text ?? undefined
      );

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
        },
      };

      return {
        product,
        source,
        price: row.price as number,
        rrp: row.rrp,
        availability,
        currencyCode,
        scrapedAt: row.scraped_at,
      };
    });
}
