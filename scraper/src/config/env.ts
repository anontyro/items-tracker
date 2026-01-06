import dotenv from "dotenv";

// Load environment variables from .env when running locally
dotenv.config();

export interface ScraperConfig {
  scrapeSchedule: string; // cron expression
  rateLimitDelayMs: number;
  maxRetries: number;
  retryDelayMs: number;
  backendApiUrl: string;
  apiKey: string;
}

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: ScraperConfig = {
  scrapeSchedule: requireEnv("SCRAPE_SCHEDULE", "0 0 * * *"),
  rateLimitDelayMs: Number(requireEnv("RATE_LIMIT_DELAY", "2000")),
  maxRetries: Number(requireEnv("MAX_RETRIES", "2")),
  retryDelayMs: Number(requireEnv("RETRY_DELAY", "5000")),
  backendApiUrl: requireEnv("BACKEND_API_URL", "http://localhost:3001"),
  apiKey: requireEnv("API_KEY", "change-me"),
};
