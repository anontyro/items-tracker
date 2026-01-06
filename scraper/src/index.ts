import { config } from "./config/env";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

async function main() {
  logger.info({ config }, "Scraper service starting");

  // TODO: wire up BullMQ queues and Playwright-based scraping in later steps

  // For now, just keep the process alive so dev mode can attach future workers
  logger.info("Scraper service foundation is running. Implement jobs next.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error in scraper service", err);
  process.exit(1);
});
