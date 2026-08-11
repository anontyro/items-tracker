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
  productImageList?: string;
  productImageDetail?: string;
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
  followProductPageForImage?: boolean;
  // When true, each list page navigation gets a brand-new browser context
  // (fresh cookies/session) instead of reusing one context across pagination.
  // Needed for sites whose bot protection challenges repeat navigations
  // within the same session.
  freshContextPerPage?: boolean;
  // "url" (default): pagination is driven by navigating to real hrefs.
  // "click": there is no per-page URL; pagination is an AJAX widget, so
  // `paginationSelector` is clicked and the engine waits for the first
  // product card to change before scraping the next page.
  // "template": there is no usable href/click state to discover pages from,
  // but every page IS directly addressable via `pageUrlTemplate` — every
  // page transition (not just resume) is driven by constructing that URL.
  paginationMode?: "url" | "click" | "template";
  // Optional URL template with a literal "{page}" placeholder (e.g.
  // "https://example.com/collection?page={page}"), used to construct a
  // direct link to page N. For "url"-mode sites this is only used to jump
  // straight to a resumed startPage before falling back to normal
  // href-discovery for subsequent pages. For "template"-mode sites it's the
  // sole per-page navigation mechanism. Page 1 always uses `listPageUrl`
  // verbatim, never the template (some sites' page-1 URL has no "?page=1"/
  // "/page/1" suffix at all).
  pageUrlTemplate?: string;
  // Optional CSS selector for an element whose text content contains the
  // total result count (e.g. "6730"), used as a fallback total-page/
  // total-product estimator (for progress logging) when no numeric page
  // links can be found in the pagination controls.
  totalCountSelector?: string;
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
      `Invalid or missing numeric field '${field}' in site config`,
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
      "selectors.productAvailability",
    ),
    productRrp: ensureString(raw.productRrp, "selectors.productRrp"),
    productUrl: ensureString(raw.productUrl, "selectors.productUrl"),
    productSku: ensureString(raw.productSku, "selectors.productSku"),
    productImageList:
      typeof raw.productImageList === "string"
        ? raw.productImageList
        : undefined,
    productImageDetail:
      typeof raw.productImageDetail === "string"
        ? raw.productImageDetail
        : undefined,
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
  const followProductPageForImage =
    typeof raw.followProductPageForImage === "boolean"
      ? raw.followProductPageForImage
      : false;
  const freshContextPerPage =
    typeof raw.freshContextPerPage === "boolean"
      ? raw.freshContextPerPage
      : false;
  const paginationMode: SiteConfig["paginationMode"] =
    raw.paginationMode === "click"
      ? "click"
      : raw.paginationMode === "template"
        ? "template"
        : "url";
  const pageUrlTemplate =
    typeof raw.pageUrlTemplate === "string" ? raw.pageUrlTemplate : undefined;
  const totalCountSelector =
    typeof raw.totalCountSelector === "string"
      ? raw.totalCountSelector
      : undefined;

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
    followProductPageForImage,
    freshContextPerPage,
    paginationMode,
    pageUrlTemplate,
    totalCountSelector,
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
