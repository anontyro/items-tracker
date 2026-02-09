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

export interface BackendBatchResponse {
  accepted: number;
  failed: number;
  newProducts?: number;
  newSources?: number;
  updatedSources?: number;
  totalSnapshots?: number;
}

export interface BackendIngestSummary {
  totalSnapshots: number;
  accepted: number;
  failed: number;
  newProducts: number;
  newSources: number;
  updatedSources: number;
}

export interface ImageFromScrapePayload {
  sourceUrl: string;
  remoteImageUrl: string;
}

function getBackendBatchSize(): number {
  const fallback = 50;
  const raw = process.env.SCRAPER_BACKEND_BATCH_SIZE;

  if (!raw) {
    return fallback;
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }

  return Math.floor(n);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function toPriceSnapshotPayload(
  normalized: NormalizedPriceHistoryInput,
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
}): Promise<BackendIngestSummary> {
  const { apiBaseUrl, apiKey, normalized } = options;

  if (!normalized.length) {
    return {
      totalSnapshots: 0,
      accepted: 0,
      failed: 0,
      newProducts: 0,
      newSources: 0,
      updatedSources: 0,
    };
  }

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/price-history/batch`;

  const snapshots: PriceSnapshotPayload[] = normalized.map((n) =>
    toPriceSnapshotPayload(n),
  );

  const batchSize = getBackendBatchSize();
  const batches = chunkArray(snapshots, batchSize);

  let totalSnapshots = 0;
  let accepted = 0;
  let failed = 0;
  let newProducts = 0;
  let newSources = 0;
  let updatedSources = 0;

  for (const batch of batches) {
    const payload: PriceSnapshotBatchPayload = { snapshots: batch };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      timeout: 10000,
    });

    const data = response.data as BackendBatchResponse;

    const batchTotal =
      typeof data.totalSnapshots === "number"
        ? data.totalSnapshots
        : batch.length;

    totalSnapshots += batchTotal;
    accepted += typeof data.accepted === "number" ? data.accepted : batchTotal;
    failed += typeof data.failed === "number" ? data.failed : 0;
    newProducts += typeof data.newProducts === "number" ? data.newProducts : 0;
    newSources += typeof data.newSources === "number" ? data.newSources : 0;
    updatedSources +=
      typeof data.updatedSources === "number" ? data.updatedSources : 0;
  }

  return {
    totalSnapshots,
    accepted,
    failed,
    newProducts,
    newSources,
    updatedSources,
  };
}

export async function sendImagesFromScrape(options: {
  apiBaseUrl: string;
  apiKey: string;
  normalized: NormalizedPriceHistoryInput[];
}): Promise<void> {
  const { apiBaseUrl, apiKey, normalized } = options;

  if (!normalized.length) {
    return;
  }

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/images/from-scrape`;

  const seen = new Set<string>();

  for (const n of normalized) {
    const sourceUrl = n.source.sourceUrl;
    const additional = n.source.additionalData ?? {};
    const imageUrl = (additional as any).imageUrl as string | undefined | null;

    if (!sourceUrl || !imageUrl) {
      continue;
    }

    const key = `${sourceUrl}::${imageUrl}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    try {
      const payload: ImageFromScrapePayload = {
        sourceUrl,
        remoteImageUrl: imageUrl,
      };

      await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        timeout: 10000,
      });
    } catch {
      // Best-effort only: failures here should not break the main scrape flow.
      // Errors are intentionally swallowed; they can be inspected via backend logs.
    }
  }
}
