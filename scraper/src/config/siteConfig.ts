import { promises as fs } from "fs";
import path from "path";

export interface SiteSelectors {
  productList: string;
  productName: string;
  productPrice: string;
  productAvailability: string;
  productRrp: string;
  productUrl: string;
  productSku: string;
}

export interface SiteConfig {
  siteId: string;
  siteName: string;
  baseUrl: string;
  listPageUrl: string;
  itemType: string;
  selectors: SiteSelectors;
  rateLimitMs: number;
  paginationSelector: string;
  isActive: boolean;
}

const SITES_DIR = path.resolve(__dirname, "../../config/sites");

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid or missing field '${field}' in site config`);
  }
  return value;
}

function ensureNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Invalid or missing numeric field '${field}' in site config`
    );
  }
  return value;
}

function ensureSelectors(raw: any): SiteSelectors {
  if (!raw || typeof raw !== "object") {
    throw new Error("Missing or invalid selectors object in site config");
  }

  return {
    productList: ensureString(raw.productList, "selectors.productList"),
    productName: ensureString(raw.productName, "selectors.productName"),
    productPrice: ensureString(raw.productPrice, "selectors.productPrice"),
    productAvailability: ensureString(
      raw.productAvailability,
      "selectors.productAvailability"
    ),
    productRrp: ensureString(raw.productRrp, "selectors.productRrp"),
    productUrl: ensureString(raw.productUrl, "selectors.productUrl"),
    productSku: ensureString(raw.productSku, "selectors.productSku"),
  };
}

function validateSiteConfig(raw: any): SiteConfig {
  const siteId = ensureString(raw.siteId, "siteId");
  const siteName = ensureString(raw.siteName, "siteName");
  const baseUrl = ensureString(raw.baseUrl, "baseUrl");
  const listPageUrl = ensureString(raw.listPageUrl, "listPageUrl");
  const itemType = ensureString(raw.itemType, "itemType");
  const selectors = ensureSelectors(raw.selectors);
  const rateLimitMs = ensureNumber(raw.rateLimitMs, "rateLimitMs");
  const paginationSelector =
    typeof raw.paginationSelector === "string"
      ? raw.paginationSelector
      : undefined;
  const isActive = Boolean(raw.isActive);

  return {
    siteId,
    siteName,
    baseUrl,
    listPageUrl,
    itemType,
    selectors,
    rateLimitMs,
    paginationSelector,
    isActive,
  };
}

export async function loadSiteConfigs(): Promise<SiteConfig[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(SITES_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // No config directory yet – treat as zero sites configured.
      return [];
    }
    throw err;
  }

  const jsonFiles = entries.filter((name) => name.endsWith(".json"));
  const configs: SiteConfig[] = [];

  for (const file of jsonFiles) {
    const fullPath = path.join(SITES_DIR, file);
    const rawJson = await fs.readFile(fullPath, "utf8");
    const parsed = JSON.parse(rawJson);
    const config = validateSiteConfig(parsed);
    configs.push(config);
  }

  return configs;
}

export function getActiveSiteConfigs(configs: SiteConfig[]): SiteConfig[] {
  return configs.filter((cfg) => cfg.isActive);
}
