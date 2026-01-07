import {
  RawScrapedProductRow,
  getLatestScrapedProductsForSite,
  saveScrapedProducts,
} from "./storage/sqlite";
import { getActiveSiteConfigs, loadSiteConfigs } from "./config/siteConfig";

import { config } from "./config/env";
import { normalizeRowsForSite } from "./normalization/normalize";
import pino from "pino";
import { scrapeSiteWithPlaywright } from "./scraper/boardGameScraper";
import { sendPriceSnapshotsBatch } from "./client/backendApi";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

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
    "Loaded scraper site configurations"
  );

  for (const site of activeSites) {
    logger.info({ siteId: site.siteId }, "Starting sample scrape for site");

    const products = await scrapeSiteWithPlaywright(site, logger, {
      maxPages: config.maxPages,
    });

    if (!disableSqlite) {
      saveScrapedProducts(config.sqlitePath, products);

      const latestRows: RawScrapedProductRow[] =
        getLatestScrapedProductsForSite(config.sqlitePath, site.siteId);

      const normalized = normalizeRowsForSite(site, latestRows);

      const ingestSummary = await sendPriceSnapshotsBatch({
        apiBaseUrl: config.backendApiUrl,
        apiKey: config.apiKey,
        normalized,
      });

      logger.info(
        {
          siteId: site.siteId,
          normalizedCount: normalized.length,
          ingestSummary,
        },
        "Pushed normalized price snapshots to backend API"
      );
    } else {
      logger.info(
        { siteId: site.siteId, count: products.length },
        "SCRAPER_DISABLE_SQLITE is set; skipping SQLite persistence for site"
      );
    }

    logger.info(
      {
        siteId: site.siteId,
        productCount: products.length,
        sampleNames: products.slice(0, 5).map((p) => p.name),
        sqlitePath: config.sqlitePath,
      },
      "Completed sample scrape for site"
    );
  }

  // TODO: wire up BullMQ queues and Playwright-based scraping in later steps

  // For now, just keep the process alive so dev mode can attach future workers
  logger.info("Scraper service foundation is running. Implement jobs next.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error in scraper service", err);
  process.exit(1);
});
