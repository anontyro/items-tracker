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

interface CliOptions {
  limit: number;
  runId?: string;
  apiUrl?: string;
  apiKey?: string;
}

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    limit: 50,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--limit" && i + 1 < argv.length) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) {
        opts.limit = Math.floor(n);
      }
    } else if (arg === "--run-id" && i + 1 < argv.length) {
      opts.runId = argv[++i];
    } else if (arg === "--api-url" && i + 1 < argv.length) {
      opts.apiUrl = argv[++i];
    } else if (arg === "--api-key" && i + 1 < argv.length) {
      opts.apiKey = argv[++i];
    }
  }

  return opts;
}

function getSyncApiConfig(cli: CliOptions) {
  const apiBaseUrl =
    cli.apiUrl ||
    process.env.SYNC_API_URL ||
    process.env.BACKEND_API_URL ||
    config.backendApiUrl;
  const apiKey =
    cli.apiKey ||
    process.env.SYNC_API_KEY ||
    process.env.API_KEY ||
    config.apiKey;

  return { apiBaseUrl, apiKey };
}

function computeNextAttemptIso(currentAttempts: number): string {
  const baseDelayMs = 30_000; // 30s
  const maxDelayMs = 60 * 60 * 1000; // 1h
  const attempt = Math.max(currentAttempts, 0) + 1;
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
  return new Date(Date.now() + delay).toISOString();
}

async function main() {
  const argv = process.argv.slice(2);
  const cli = parseArgs(argv);

  const { apiBaseUrl, apiKey } = getSyncApiConfig(cli);

  logger.info(
    {
      sqlitePath: config.sqlitePath,
      limit: cli.limit,
      runId: cli.runId,
      apiBaseUrl,
    },
    "Starting manual sync of pending price history queue items"
  );

  const nowIso = new Date().toISOString();

  const options: FetchPendingQueueOptions = {
    nowIso,
    limit: cli.limit,
    runId: cli.runId,
  };

  const items: PriceHistorySyncQueueRow[] = fetchPendingQueueItems(
    config.sqlitePath,
    options
  );

  if (!items.length) {
    logger.info("No eligible queue items found");
    return;
  }

  logger.info({ count: items.length }, "Found queue items to process");

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

  logger.info("Manual sync complete");
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err: message }, "Fatal error in manual sync script");
  process.exit(1);
});
