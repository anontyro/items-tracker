// Core product types shared across frontend, desktop, and API

export interface ProductSummary {
  id: string;
  name: string;
  type: string;
  sources?: ProductSourceSummary[];
  bggId?: string | null;
}

export interface ProductDetail extends ProductSummary {
  bggId?: string | null;
  createdAt: string;
  updatedAt: string;
  sources: ProductSourceSummary[];
}

export interface ProductSourceSummary {
  id: string;
  sourceName: string;
  sourceUrl: string;
  sku?: string | null;
  additionalData?: {
    siteId?: string | null;
  } | null;
}

export interface PriceHistoryPoint {
  id: string;
  productId: string;
  sourceId: string;
  price: string;
  rrp: string | null;
  availability: boolean | null;
  scrapedAt: string;
}

// API Response types
export interface ProductSearchResponse {
  items: ProductSummary[];
  total: number;
}

export interface ProductHistoryResponse {
  items: PriceHistoryPoint[];
}

export interface GroupedProductItem {
  groupKey: string;
  bggId: string | null;
  name: string;
  type: string;
  products: ProductDetail[];
  sources: ProductSourceSummary[];
}

export interface GroupedProductsResponse {
  items: GroupedProductItem[];
  total: number;
}

// Watchlist types
export interface WatchlistItem {
  id: string;
  name: string;
}

// Admin types
export interface UpdateBggIdRequest {
  bggId: string | null;
  bggCanonicalName?: string | null;
}

// Site configuration
export interface SiteConfig {
  siteId: string;
  siteName: string;
  baseUrl: string;
  listPageUrl: string;
  itemType: string;
  rateLimitMs: number;
  isActive: boolean;
}
