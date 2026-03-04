// Shared API client for Board Game Price Tracker
// Works in both browser (Next.js) and Electron renderer environments

import type {
  ProductSummary,
  ProductDetail,
  ProductSearchResponse,
  ProductHistoryResponse,
  GroupedProductsResponse,
  UpdateBggIdRequest,
} from 'shared-types';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  adminApiKey?: string;
}

export interface ProductSearchOptions {
  q?: string;
  limit?: number;
  offset?: number;
  siteId?: string;
}

export interface ProductHistoryOptions {
  productId: string;
  limit?: number;
}

export interface ProductsMissingBggOptions {
  limit?: number;
  offset?: number;
}

// Environment-aware base URL getter
function getBaseUrl(configOverride?: string): string {
  if (configOverride) {
    return configOverride.replace(/\/$/, '');
  }

  // Browser environment (Next.js or Electron renderer)
  if (typeof window !== 'undefined') {
    // Electron renderer with API config from settings
    const electronConfig = (window as any).__ELECTRON_CONFIG__;
    if (electronConfig?.apiBaseUrl) {
      return electronConfig.apiBaseUrl.replace(/\/$/, '');
    }

    // Next.js - use environment variable
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
    }

    // Fallback to relative API path for Next.js
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  return '';
}

// Generic fetch wrapper with API key handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  config: ApiClientConfig,
): Promise<T> {
  const url = `${config.baseUrl}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add API key header
  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API request failed with status ${response.status}`,
    );
  }

  return response.json();
}

// Products API
export async function fetchProducts(
  options: ProductSearchOptions = {},
  config: ApiClientConfig,
): Promise<ProductSearchResponse> {
  const { q = '', limit = 50, offset = 0, siteId } = options;

  const url = new URL('/v1/products', config.baseUrl);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  if (siteId) {
    url.searchParams.set('siteId', siteId);
  }

  return fetchApi<ProductSearchResponse>(url.toString(), {}, config);
}

export async function fetchProductDetail(
  id: string,
  config: ApiClientConfig,
): Promise<ProductDetail> {
  return fetchApi<ProductDetail>(`/v1/products/${encodeURIComponent(id)}`, {}, config);
}

export async function fetchProductHistory(
  options: ProductHistoryOptions,
  config: ApiClientConfig,
): Promise<ProductHistoryResponse> {
  const { productId, limit = 365 } = options;

  const url = new URL(
    `/v1/products/${encodeURIComponent(productId)}/history`,
    config.baseUrl,
  );
  url.searchParams.set('limit', String(limit));

  return fetchApi<ProductHistoryResponse>(url.toString(), {}, config);
}

export async function fetchGroupedProducts(
  options: { q?: string; siteId?: string; bggId?: string },
  config: ApiClientConfig,
): Promise<GroupedProductsResponse> {
  const { q = '', siteId, bggId } = options;

  const url = new URL('/v1/products/grouped', config.baseUrl);
  if (q) {
    url.searchParams.set('q', q);
  }
  if (siteId) {
    url.searchParams.set('siteId', siteId);
  }
  if (bggId) {
    url.searchParams.set('bggId', bggId);
  }

  return fetchApi<GroupedProductsResponse>(url.toString(), {}, config);
}

// Admin API
export async function fetchProductsMissingBgg(
  options: ProductsMissingBggOptions = {},
  config: ApiClientConfig,
): Promise<ProductSearchResponse> {
  const { limit = 50, offset = 0 } = options;

  if (!config.adminApiKey) {
    throw new Error('Admin API key is required for this endpoint');
  }

  const url = new URL('/v1/products/missing-bgg', config.baseUrl);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  return fetchApi<ProductSearchResponse>(
    url.toString(),
    {},
    { ...config, apiKey: config.adminApiKey },
  );
}

export async function updateProductBggId(
  productId: string,
  body: UpdateBggIdRequest,
  config: ApiClientConfig,
): Promise<ProductDetail> {
  if (!config.adminApiKey) {
    throw new Error('Admin API key is required for this endpoint');
  }

  return fetchApi<ProductDetail>(
    `/v1/products/${encodeURIComponent(productId)}/bgg`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    { ...config, apiKey: config.adminApiKey },
  );
}

// Factory function to create configured API client
export function createApiClient(config: ApiClientConfig) {
  return {
    products: {
      search: (options?: ProductSearchOptions) =>
        fetchProducts(options, config),
      getDetail: (id: string) => fetchProductDetail(id, config),
      getHistory: (options: ProductHistoryOptions) =>
        fetchProductHistory(options, config),
      getGrouped: (options?: { q?: string; siteId?: string; bggId?: string }) =>
        fetchGroupedProducts(options, config),
      getMissingBgg: (options?: ProductsMissingBggOptions) =>
        fetchProductsMissingBgg(options, config),
      updateBggId: (productId: string, body: UpdateBggIdRequest) =>
        updateProductBggId(productId, body, config),
    },
  };
}

// Default export for simple usage
export default createApiClient;
