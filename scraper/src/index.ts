import {
  completeScrapeProgress,
  createScrapeProgress,
  enqueuePriceHistoryBatch,
  findResumableProgress,
  markQueueItemFailed,
  markQueueItemSent,
  pruneScrapedProductsRaw,
  saveScrapedProducts,
  updateScrapeProgress,
} from "./storage/sqlite";
import {
  SiteConfig,
  getActiveSiteConfigs,
  loadSiteConfigs,
} from "./config/siteConfig";
import {
  sendImagesFromScrape,
  sendPriceSnapshotsBatch,
  sendScrapeRunStatus,
} from "./client/backendApi";

import { config } from "./config/env";
import { normalizeScrapedProducts } from "./normalization/normalize";
import pino from "pino";
import { scrapeSiteWithPlaywright } from "./scraper/boardGameScraper";
import {
  SiteRunSummary,
  createScrapeRunStats,
  printRunReport,
  recordIssue,
  summarizeSiteRun,
} from "./scraper/scrapeStats";

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

interface RunContext {
  runId: string;
  runStartedAtIso: string;
  startPage: number;
  isResume: boolean;
  resumeLastUpdatedAtIso?: string;
}

// Decides whether this site has an interrupted run worth picking up where it
// left off, or should start fresh. A run is only resumable via sqlite (it's
// where progress bookkeeping lives) and only within the configured
// staleness window (an ancient abandoned run is left alone, not resumed,
// since resuming across too large a time gap on a live-changing catalog
// risks position drift).
function resolveRunContext(site: SiteConfig, disableSqlite: boolean): RunContext {
  if (!disableSqlite && !config.forceRestart) {
    const resumable = findResumableProgress(
      config.sqlitePath,
      site.siteId,
      config.resumeStalenessWindowMs,
    );
    if (resumable) {
      return {
        runId: resumable.run_id,
        runStartedAtIso: resumable.started_at,
        startPage: resumable.last_completed_page + 1,
        isResume: true,
        resumeLastUpdatedAtIso: resumable.updated_at,
      };
    }
  }

  const runStartedAtIso = new Date().toISOString();
  return {
    runId: `${site.siteId}-${runStartedAtIso}`,
    runStartedAtIso,
    startPage: config.startPage ?? 1,
    isResume: false,
  };
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

  if (!disableSqlite) {
    const pruneResult = pruneScrapedProductsRaw(config.sqlitePath, {
      retentionDays: config.rawRetentionDays,
      maxBytes: config.rawMaxBytes,
    });
    logger.info(
      {
        sqlitePath: config.sqlitePath,
        retentionDays: config.rawRetentionDays,
        maxBytes: config.rawMaxBytes,
        ...pruneResult,
      },
      "Pruned scraped_products_raw",
    );
  }

  const runSummaries: SiteRunSummary[] = [];

  for (const site of sitesToScrape) {
    const runContext = resolveRunContext(site, disableSqlite);
    const { runId, runStartedAtIso, isResume } = runContext;
    const startPageForRun = runContext.startPage;

    if (isResume) {
      if (startPageForRun > 1 && !site.pageUrlTemplate) {
        logger.warn(
          { siteId: site.siteId, runId },
          "Resuming a run for a site with no pageUrlTemplate configured; resume will be ineffective (pagination has to restart from page 1)",
        );
      }
      logger.info(
        {
          siteId: site.siteId,
          runId,
          resumeFromPage: startPageForRun,
          lastUpdatedAt: runContext.resumeLastUpdatedAtIso,
        },
        "Resuming previous incomplete scrape run",
      );
    } else {
      logger.info({ siteId: site.siteId, runId }, "Starting scrape for site");
      if (!disableSqlite) {
        createScrapeProgress(config.sqlitePath, {
          runId,
          siteId: site.siteId,
          startedAtIso: runStartedAtIso,
        });
      }
    }

    let totalProducts = 0;
    const sampleNames: string[] = [];
    const runError: string | null = null;
    const stats = createScrapeRunStats();
    let lastProgressLogAtCount = 0;

    for await (const pageProducts of scrapeSiteWithPlaywright(site, logger, {
      maxPages: config.maxPages,
      startPage: startPageForRun,
      enableDetailImages: config.enableDetailImages,
      stats,
    })) {
      totalProducts += pageProducts.length;

      if (sampleNames.length < 5) {
        const remaining = 5 - sampleNames.length;
        sampleNames.push(
          ...pageProducts.slice(0, remaining).map((p) => p.name),
        );
      }

      if (!disableSqlite) {
        saveScrapedProducts(config.sqlitePath, pageProducts, runStartedAtIso);

        const pageNormalized = normalizeScrapedProducts(
          site,
          pageProducts,
          runStartedAtIso,
        );

        const queueId = enqueuePriceHistoryBatch(config.sqlitePath, {
          runId,
          siteId: site.siteId,
          payloadJson: JSON.stringify({ normalized: pageNormalized }),
        });

        // Persist progress *before* attempting the network push: the raw
        // save + outbox enqueue above already durably captured this page,
        // so it doesn't need to be re-scraped on resume regardless of
        // whether the push below succeeds — a push failure is retried
        // independently via the outbox, not by re-scraping.
        updateScrapeProgress(config.sqlitePath, runId, {
          lastCompletedPage: stats.currentAbsolutePage ?? 0,
          pagesVisitedDelta: 1,
          productsScrapedDelta: pageProducts.length,
          totalPagesEstimate: stats.totalPagesEstimate,
          totalProductsEstimate: stats.totalProductsEstimate,
        });

        try {
          await sendPriceSnapshotsBatch({
            apiBaseUrl: config.backendApiUrl,
            apiKey: config.apiKey,
            normalized: pageNormalized,
          });

          await sendImagesFromScrape({
            apiBaseUrl: config.backendApiUrl,
            apiKey: config.apiKey,
            normalized: pageNormalized,
          });

          markQueueItemSent(config.sqlitePath, queueId);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unknown error while sending batch";

          markQueueItemFailed(
            config.sqlitePath,
            queueId,
            message,
            computeNextAttemptIso(0),
          );

          recordIssue(stats, {
            type: "immediate_push_failed",
            page: stats.currentAbsolutePage ?? 0,
            message,
          });

          logger.warn(
            {
              siteId: site.siteId,
              runId,
              queueId,
              page: stats.currentAbsolutePage,
              err: message,
            },
            "Failed to push page's price snapshots immediately; queued for retry via sync worker",
          );
        }
      } else {
        // SCRAPER_DISABLE_SQLITE mode: legacy/degraded fallback only — no
        // outbox durability and no resume bookkeeping, since both require
        // sqlite. Still attempt a best-effort push per page rather than
        // silently dropping all data as before.
        try {
          const pageNormalized = normalizeScrapedProducts(
            site,
            pageProducts,
            new Date().toISOString(),
          );

          await sendPriceSnapshotsBatch({
            apiBaseUrl: config.backendApiUrl,
            apiKey: config.apiKey,
            normalized: pageNormalized,
          });

          await sendImagesFromScrape({
            apiBaseUrl: config.backendApiUrl,
            apiKey: config.apiKey,
            normalized: pageNormalized,
          });
        } catch (err) {
          logger.warn(
            { siteId: site.siteId, err },
            "Best-effort push failed with SQLite disabled; data not durably queued (SCRAPER_DISABLE_SQLITE is a degraded/legacy mode)",
          );
        }
      }

      if (
        stats.productCount - lastProgressLogAtCount >=
        config.progressLogEveryProducts
      ) {
        lastProgressLogAtCount = stats.productCount;

        const elapsedMs = Date.now() - stats.startedAtMs;
        const rateProductsPerMs = stats.productCount / Math.max(elapsedMs, 1);
        const remainingProducts =
          stats.totalProductsEstimate != null
            ? Math.max(stats.totalProductsEstimate - stats.productCount, 0)
            : null;
        const percentComplete =
          stats.totalProductsEstimate != null && stats.totalProductsEstimate > 0
            ? Math.min(
                100,
                (stats.productCount / stats.totalProductsEstimate) * 100,
              )
            : null;
        const etaMs =
          remainingProducts != null && rateProductsPerMs > 0
            ? remainingProducts / rateProductsPerMs
            : null;

        logger.info(
          {
            siteId: site.siteId,
            runId,
            pagesVisited: stats.pagesVisited,
            pagesExtracted: stats.pagesExtracted,
            productsScraped: stats.productCount,
            totalProductsEstimate: stats.totalProductsEstimate,
            totalPagesEstimate: stats.totalPagesEstimate,
            percentComplete:
              percentComplete != null
                ? Number(percentComplete.toFixed(1))
                : null,
            etaMinutes:
              etaMs != null ? Number((etaMs / 60000).toFixed(1)) : null,
          },
          "Scrape progress",
        );
      }
    }

    if (!disableSqlite) {
      completeScrapeProgress(config.sqlitePath, runId);
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

    const summary = summarizeSiteRun({
      siteId: site.siteId,
      siteName: site.siteName,
      runId,
      stats,
      productCount: totalProducts,
      runError,
    });
    runSummaries.push(summary);

    logger[summary.needsAttention ? "warn" : "info"](
      {
        siteId: site.siteId,
        runId,
        pagesVisited: summary.pagesVisited,
        pagesExtracted: summary.pagesExtracted,
        productCount: summary.productCount,
        issueCounts: summary.issueCounts,
        flags: summary.flags.map((f) => f.code),
        needsAttention: summary.needsAttention,
      },
      summary.needsAttention
        ? "Site scrape finished with issues that need review"
        : "Site scrape finished cleanly",
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

  printRunReport(runSummaries);

  const flaggedSites = runSummaries.filter((s) => s.needsAttention);
  if (flaggedSites.length) {
    logger.warn(
      {
        flaggedSiteIds: flaggedSites.map((s) => s.siteId),
        summaries: flaggedSites.map((s) => ({
          siteId: s.siteId,
          productCount: s.productCount,
          flags: s.flags.map((f) => f.code),
        })),
      },
      "Scrape run finished with sites that need review",
    );
  }

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
