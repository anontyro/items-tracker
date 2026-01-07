import { NormalizedPriceHistoryInput } from "../normalization/normalize";
import axios from "axios";

export interface RawSnapshotMetaPayload {
  siteId: string;
  sourceProductId?: string | null;
  priceText?: string | null;
  rrpText?: string | null;
  availabilityText?: string | null;
}

export interface PriceSnapshotPayload {
  productName: string;
  productType: string;
  sourceName: string;
  sourceUrl: string;
  sku?: string | null;
  price: number;
  currencyCode?: string | null;
  rrp?: number | null;
  availability?: boolean | null;
  scrapedAt: string;
  raw: RawSnapshotMetaPayload;
}

export interface PriceSnapshotBatchPayload {
  snapshots: PriceSnapshotPayload[];
}

function toPriceSnapshotPayload(
  normalized: NormalizedPriceHistoryInput
): PriceSnapshotPayload {
  const { product, source, price, rrp, availability, currencyCode, scrapedAt } =
    normalized;

  const additional = source.additionalData ?? {};

  return {
    productName: product.name,
    productType: product.type,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    sku: source.sku ?? null,
    price,
    currencyCode: currencyCode ?? null,
    rrp: rrp ?? null,
    availability: availability ?? null,
    scrapedAt,
    raw: {
      siteId: String(additional.siteId ?? ""),
      sourceProductId:
        (additional.sourceProductId as string | null | undefined) ?? null,
      priceText: (additional.priceText as string | null | undefined) ?? null,
      rrpText: (additional.rrpText as string | null | undefined) ?? null,
      availabilityText:
        (additional.availabilityText as string | null | undefined) ?? null,
    },
  };
}

export async function sendPriceSnapshotsBatch(options: {
  apiBaseUrl: string;
  apiKey: string;
  normalized: NormalizedPriceHistoryInput[];
}): Promise<void> {
  const { apiBaseUrl, apiKey, normalized } = options;

  if (!normalized.length) {
    return;
  }

  const snapshots: PriceSnapshotPayload[] = normalized.map((n) =>
    toPriceSnapshotPayload(n)
  );

  const payload: PriceSnapshotBatchPayload = { snapshots };

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/price-history/batch`;

  await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    timeout: 10000,
  });
}
