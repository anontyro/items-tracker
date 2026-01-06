import { getActiveSiteConfigs, loadSiteConfigs } from "./config/siteConfig";

import { config } from "./config/env";
import pino from "pino";
import { scrapeSiteWithPlaywright } from "./scraper/boardGameScraper";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

async function main() {
  logger.info({ config }, "Scraper service starting");

  const allSites = await loadSiteConfigs();
  const activeSites = getActiveSiteConfigs(allSites);

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

    logger.info(
      {
        siteId: site.siteId,
        productCount: products.length,
        sampleNames: products.slice(0, 5).map((p) => p.name),
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
