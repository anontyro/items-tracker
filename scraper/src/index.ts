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
  sendScrapeRunStatus,
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

  const targetSiteIdsEnv =
    process.env.SCRAPER_SITE_IDS ?? process.env.SCRAPER_SITE_ID ?? "";
  const targetSiteIds = targetSiteIdsEnv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const sitesToScrape =
    targetSiteIds.length > 0
      ? activeSites.filter((site) => targetSiteIds.includes(site.siteId))
      : activeSites;

  const disableSqlite =
    process.env.SCRAPER_DISABLE_SQLITE === "1" ||
    process.env.SCRAPER_DISABLE_SQLITE === "true";

  logger.info(
    {
      siteCount: allSites.length,
      activeSiteIds: activeSites.map((s) => s.siteId),
      targetSiteIds,
      scrapingSiteIds: sitesToScrape.map((s) => s.siteId),
    },
    "Loaded scraper site configurations",
  );

  for (const site of sitesToScrape) {
    logger.info({ siteId: site.siteId }, "Starting sample scrape for site");

    const runStartedAtIso = new Date().toISOString();
    const runId = `${site.siteId}-${runStartedAtIso}`;
    let totalProducts = 0;
    const sampleNames: string[] = [];
    let runError: string | null = null;

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

        saveScrapedProducts(config.sqlitePath, pageProducts, runStartedAtIso);
      }

      const latestRows: RawScrapedProductRow[] =
        getLatestScrapedProductsForSite(config.sqlitePath, site.siteId);

      const normalized = normalizeRowsForSite(site, latestRows);

      const queuePayload = { normalized };

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

        runError = message;

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

    const runFinishedAtIso = new Date().toISOString();

    logger.info(
      {
        siteId: site.siteId,
        productCount: totalProducts,
        sampleNames,
        sqlitePath: config.sqlitePath,
        runId,
        runStartedAtIso,
        runFinishedAtIso,
        runError,
      },
      "Completed sample scrape for site",
    );

    await sendScrapeRunStatus({
      apiBaseUrl: config.backendApiUrl,
      apiKey: config.apiKey,
      siteId: site.siteId,
      status: runError ? "FAILURE" : "SUCCESS",
      startedAt: runStartedAtIso,
      finishedAt: runFinishedAtIso,
      itemCount: totalProducts,
      errorMessage: runError,
      runId,
    });
  }

  // TODO: wire up BullMQ queues and Playwright-based scraping in later steps

  if (config.serviceMode) {
    logger.info(
      "SCRAPER_SERVICE_MODE is enabled; keeping process alive for future jobs.",
    );
  } else {
    logger.info("Scraper service run completed in one-shot mode.");
  }
}

main()
  .then(() => {
    if (config.serviceMode) {
      logger.info(
        "Service mode is enabled; main() completed but process will remain running.",
      );
      return;
    }

    logger.info("Scraper service run completed; exiting.");
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Fatal error in scraper service", err);
    process.exit(1);
  });
