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
  serviceMode: boolean;
  progressLogEveryProducts: number; // log a progress summary every N products scraped
  resumeStalenessWindowMs: number; // how old an incomplete run can be and still be resumed
  forceRestart: boolean; // ignore any resumable run and start fresh
  rawRetentionDays: number; // scraped_products_raw: drop rows older than this
  rawMaxBytes: number; // scraped_products_raw: hard cap safety valve on top of the retention window
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
  serviceMode:
    process.env.SCRAPER_SERVICE_MODE === "1" ||
    process.env.SCRAPER_SERVICE_MODE === "true",
  progressLogEveryProducts:
    optionalPositiveIntEnv("SCRAPER_PROGRESS_LOG_EVERY") ?? 1000,
  resumeStalenessWindowMs:
    (optionalPositiveIntEnv("SCRAPER_RESUME_STALENESS_HOURS") ?? 24) *
    60 *
    60 *
    1000,
  forceRestart:
    process.env.SCRAPER_FORCE_RESTART === "1" ||
    process.env.SCRAPER_FORCE_RESTART === "true",
  rawRetentionDays: optionalPositiveIntEnv("SCRAPER_RAW_RETENTION_DAYS") ?? 30,
  rawMaxBytes:
    optionalPositiveIntEnv("SCRAPER_RAW_MAX_BYTES") ?? 1_073_741_824, // 1GB
};
