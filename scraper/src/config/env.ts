import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env when running locally
dotenv.config();

export interface ScraperConfig {
  scrapeSchedule: string; // cron expression
  rateLimitDelayMs: number;
  maxRetries: number;
  retryDelayMs: number;
  backendApiUrl: string;
  apiKey: string;
  startPage?: number; // optional; when undefined, scraper starts from page 1
  maxPages?: number; // optional; when undefined, scraper runs with no page limit
  sqlitePath: string;
  enableDetailImages: boolean;
}

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalPositiveIntEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return undefined;
  }

  return Math.floor(n);
}

export const config: ScraperConfig = {
  scrapeSchedule: requireEnv("SCRAPE_SCHEDULE", "0 0 * * *"),
  rateLimitDelayMs: Number(requireEnv("RATE_LIMIT_DELAY", "2000")),
  maxRetries: Number(requireEnv("MAX_RETRIES", "2")),
  retryDelayMs: Number(requireEnv("RETRY_DELAY", "5000")),
  backendApiUrl: requireEnv("BACKEND_API_URL", "http://localhost:3001"),
  apiKey: requireEnv("API_KEY", "change-me"),
  startPage: optionalPositiveIntEnv("SCRAPER_START_PAGE"),
  maxPages: optionalPositiveIntEnv("SCRAPER_MAX_PAGES"),
  sqlitePath:
    process.env.SCRAPER_SQLITE_PATH ??
    path.resolve(process.cwd(), "scraper-data.sqlite"),
  enableDetailImages:
    process.env.SCRAPER_ENABLE_DETAIL_IMAGES === "1" ||
    process.env.SCRAPER_ENABLE_DETAIL_IMAGES === "true",
};
