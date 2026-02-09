import {
  RawScrapedProductRow,
  enqueuePriceHistoryBatch,
  getLatestScrapedProductsForSite,
  markQueueItemFailed,
  markQueueItemSent,
  saveScrapedProducts,
} from "./storage/sqlite";
import { getActiveSiteConfigs, loadSiteConfigs } from "./config/siteConfig";
import {
  sendImagesFromScrape,
  sendPriceSnapshotsBatch,
} from "./client/backendApi";

import { config } from "./config/env";
import { normalizeRowsForSite } from "./normalization/normalize";
import pino from "pino";
import { scrapeSiteWithPlaywright } from "./scraper/boardGameScraper";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

function computeNextAttemptIso(currentAttempts: number): string {
  const baseDelayMs = 30_000; // 30s
  const maxDelayMs = 60 * 60 * 1000; // 1h
  const attempt = Math.max(currentAttempts, 0) + 1;
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
  return new Date(Date.now() + delay).toISOString();
}

async function main() {
  logger.info({ config }, "Scraper service starting");

  const allSites = await loadSiteConfigs();
  const activeSites = getActiveSiteConfigs(allSites);

  const disableSqlite =
    process.env.SCRAPER_DISABLE_SQLITE === "1" ||
    process.env.SCRAPER_DISABLE_SQLITE === "true";

  logger.info(
    {
      siteCount: allSites.length,
      activeSiteIds: activeSites.map((s) => s.siteId),
    },
    "Loaded scraper site configurations",
  );

  for (const site of activeSites) {
    logger.info({ siteId: site.siteId }, "Starting sample scrape for site");

    const runScrapedAt = new Date().toISOString();
    let totalProducts = 0;
    const sampleNames: string[] = [];

    if (!disableSqlite) {
      for await (const pageProducts of scrapeSiteWithPlaywright(site, logger, {
        maxPages: config.maxPages,
        startPage: config.startPage,
        enableDetailImages: config.enableDetailImages,
      })) {
        totalProducts += pageProducts.length;

        if (sampleNames.length < 5) {
          const remaining = 5 - sampleNames.length;
          sampleNames.push(
            ...pageProducts.slice(0, remaining).map((p) => p.name),
          );
        }

        saveScrapedProducts(config.sqlitePath, pageProducts, runScrapedAt);
      }

      const latestRows: RawScrapedProductRow[] =
        getLatestScrapedProductsForSite(config.sqlitePath, site.siteId);

      const normalized = normalizeRowsForSite(site, latestRows);

      const queuePayload = { normalized };

      const runId = `${site.siteId}-${new Date().toISOString()}`;

      const queueId = enqueuePriceHistoryBatch(config.sqlitePath, {
        runId,
        siteId: site.siteId,
        payloadJson: JSON.stringify(queuePayload),
      });

      logger.info(
        {
          siteId: site.siteId,
          runId,
          queueId,
          normalizedCount: normalized.length,
        },
        "Enqueued normalized price snapshots for backend sync",
      );

      try {
        const ingestSummary = await sendPriceSnapshotsBatch({
          apiBaseUrl: config.backendApiUrl,
          apiKey: config.apiKey,
          normalized,
        });

        await sendImagesFromScrape({
          apiBaseUrl: config.backendApiUrl,
          apiKey: config.apiKey,
          normalized,
        });

        markQueueItemSent(config.sqlitePath, queueId);

        logger.info(
          {
            siteId: site.siteId,
            runId,
            queueId,
            normalizedCount: normalized.length,
            ingestSummary,
          },
          "Pushed normalized price snapshots to backend API",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error while sending batch";
        const nextAttemptAtIso = computeNextAttemptIso(0);

        markQueueItemFailed(
          config.sqlitePath,
          queueId,
          message,
          nextAttemptAtIso,
        );

        logger.error(
          { siteId: site.siteId, runId, queueId, err: message },
          "Failed to push normalized price snapshots to backend API; will retry via queue",
        );
      }
    } else {
      for await (const pageProducts of scrapeSiteWithPlaywright(site, logger, {
        maxPages: config.maxPages,
        startPage: config.startPage,
      })) {
        totalProducts += pageProducts.length;

        if (sampleNames.length < 5) {
          const remaining = 5 - sampleNames.length;
          sampleNames.push(
            ...pageProducts.slice(0, remaining).map((p) => p.name),
          );
        }
      }

      logger.info(
        { siteId: site.siteId, count: totalProducts },
        "SCRAPER_DISABLE_SQLITE is set; skipping SQLite persistence for site",
      );
    }

    logger.info(
      {
        siteId: site.siteId,
        productCount: totalProducts,
        sampleNames,
        sqlitePath: config.sqlitePath,
      },
      "Completed sample scrape for site",
    );
  }

  // TODO: wire up BullMQ queues and Playwright-based scraping in later steps

  // For now, just keep the process alive so dev mode can attach future workers
  logger.info("Scraper service foundation is running. Implement jobs next.");
}

main()
  .then(() => {
    logger.info("Scraper service run completed; exiting.");
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Fatal error in scraper service", err);
    process.exit(1);
  });
