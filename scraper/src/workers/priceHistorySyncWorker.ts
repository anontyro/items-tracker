import {
  FetchPendingQueueOptions,
  PriceHistorySyncQueueRow,
  fetchPendingQueueItems,
  markQueueItemFailed,
  markQueueItemSending,
  markQueueItemSent,
} from "../storage/sqlite";

import { NormalizedPriceHistoryInput } from "../normalization/normalize";
import { config } from "../config/env";
import pino from "pino";
import { sendPriceSnapshotsBatch } from "../client/backendApi";

interface QueuePayload {
  normalized: NormalizedPriceHistoryInput[];
}

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

function getSyncApiConfig() {
  const apiBaseUrl =
    process.env.SYNC_API_URL ||
    process.env.BACKEND_API_URL ||
    config.backendApiUrl;
  const apiKey =
    process.env.SYNC_API_KEY || process.env.API_KEY || config.apiKey;

  return { apiBaseUrl, apiKey };
}

function computeNextAttemptIso(currentAttempts: number): string {
  const baseDelayMs = 30_000; // 30s
  const maxDelayMs = 60 * 60 * 1000; // 1h
  const attempt = Math.max(currentAttempts, 0) + 1;
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
  return new Date(Date.now() + delay).toISOString();
}

async function processQueueBatch(limit: number): Promise<number> {
  const { apiBaseUrl, apiKey } = getSyncApiConfig();
  const nowIso = new Date().toISOString();

  const options: FetchPendingQueueOptions = {
    nowIso,
    limit,
  };

  const items: PriceHistorySyncQueueRow[] = fetchPendingQueueItems(
    config.sqlitePath,
    options
  );

  if (!items.length) {
    return 0;
  }

  logger.info(
    { count: items.length },
    "Found pending price history sync items"
  );

  for (const item of items) {
    markQueueItemSending(config.sqlitePath, item.id);

    let payload: QueuePayload;
    try {
      payload = JSON.parse(item.payload_json) as QueuePayload;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse payload_json";
      const nextAttemptAtIso = computeNextAttemptIso(item.attempts);
      logger.error({ id: item.id, err: message }, "Invalid queue payload JSON");
      markQueueItemFailed(
        config.sqlitePath,
        item.id,
        message,
        nextAttemptAtIso
      );
      continue;
    }

    if (!payload.normalized || !payload.normalized.length) {
      logger.info(
        { id: item.id },
        "Queue item has empty normalized payload; marking sent"
      );
      markQueueItemSent(config.sqlitePath, item.id);
      continue;
    }

    try {
      await sendPriceSnapshotsBatch({
        apiBaseUrl,
        apiKey,
        normalized: payload.normalized,
      });

      markQueueItemSent(config.sqlitePath, item.id);
      logger.info({ id: item.id }, "Successfully synced queue item");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error while sending batch";
      const nextAttemptAtIso = computeNextAttemptIso(item.attempts);
      logger.error({ id: item.id, err: message }, "Failed to sync queue item");
      markQueueItemFailed(
        config.sqlitePath,
        item.id,
        message,
        nextAttemptAtIso
      );
    }
  }

  return items.length;
}

async function main() {
  const intervalMs = Number(process.env.SYNC_WORKER_INTERVAL_MS ?? "60000");
  const batchLimit = Number(process.env.SYNC_WORKER_BATCH_LIMIT ?? "50");

  logger.info(
    {
      sqlitePath: config.sqlitePath,
      intervalMs,
      batchLimit,
    },
    "Starting price history sync worker"
  );

  // Simple loop; process then sleep.
  // This worker is intended to be run as a separate long-lived process.
  // It is safe to stop/restart; state lives in SQLite.
  //
  // Note: this will run until the process is terminated.
  for (;;) {
    try {
      const processed = await processQueueBatch(batchLimit);
      if (processed === 0) {
        logger.debug("No pending items found in queue");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { err: message },
        "Unexpected error while processing sync queue"
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err: message }, "Fatal error in sync worker");
  process.exit(1);
});
