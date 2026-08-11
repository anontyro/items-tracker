import { PruneRawResult, pruneScrapedProductsRaw } from "../storage/sqlite";

import { config } from "../config/env";
import pino from "pino";

interface CliOptions {
  retentionDays: number;
  maxBytes: number;
}

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    retentionDays: config.rawRetentionDays,
    maxBytes: config.rawMaxBytes,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--retention-days" && i + 1 < argv.length) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 0) {
        opts.retentionDays = Math.floor(n);
      }
    } else if (arg === "--max-bytes" && i + 1 < argv.length) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 0) {
        opts.maxBytes = Math.floor(n);
      }
    }
  }

  return opts;
}

async function main() {
  const argv = process.argv.slice(2);
  const cli = parseArgs(argv);

  logger.info(
    {
      sqlitePath: config.sqlitePath,
      retentionDays: cli.retentionDays,
      maxBytes: cli.maxBytes,
    },
    "Starting manual prune of scraped_products_raw",
  );

  const result: PruneRawResult = pruneScrapedProductsRaw(config.sqlitePath, {
    retentionDays: cli.retentionDays,
    maxBytes: cli.maxBytes,
  });

  logger.info(result, "Prune complete");
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err: message }, "Fatal error in manual prune script");
  process.exit(1);
});
