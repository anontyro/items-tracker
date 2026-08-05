export interface ProductSummary {
  id: string;
  name: string;
  type: string;
  sources?: ProductSourceSummary[];
  bggId?: string | null;
}

export interface ProductSearchResponse {
  items: ProductSummary[];
  total: number;
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

export interface ProductSourceSummary {
  id: string;
  sourceName: string;
  sourceUrl: string;
  sku?: string | null;
  additionalData?: {
    siteId?: string | null;
  } | null;
}

export interface ProductDetail extends ProductSummary {
  bggId?: string | null;
  createdAt: string;
  updatedAt: string;
  sources: ProductSourceSummary[];
}

export interface PriceHistoryPoint {
  id: string;
  productId: string;
  sourceId: string;
  price: string; // Prisma Decimal serialized as string
  rrp: string | null;
  availability: boolean | null;
  isPreorder: boolean | null;
  scrapedAt: string;
}

export interface ProductHistoryResponse {
  items: PriceHistoryPoint[];
}

// Server-side: call the NestJS backend directly (avoids self-fetching the
// Next.js API proxy, which fails with ECONNREFUSED in SSR).
// Client-side: call the Next.js /api/* proxy routes normally.
function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") {
    const backendBase = (
      process.env.BACKEND_API_URL || "http://localhost:3005"
    ).replace(/\/$/, "");
    const backendPath = path.replace(/^\/api\//, "/v1/");
    return fetch(`${backendBase}${backendPath}`, {
      ...init,
      headers: {
        "x-api-key": process.env.FRONTEND_API_KEY || "",
        ...(init?.headers as Record<string, string>),
      },
    });
  }
  return fetch(path, init);
}

export async function fetchProducts(options: {
  q?: string;
  limit?: number;
  offset?: number;
  siteId?: string;
}): Promise<ProductSearchResponse> {
  const { q = "", limit = 50, offset = 0, siteId } = options;

  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  if (siteId) params.set("siteId", siteId);

  const res = await apiFetch(`/api/products?${params}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }

  return res.json();
}

export async function fetchGroupedProducts(options: {
  q?: string;
  siteId?: string;
  bggId?: string;
}): Promise<GroupedProductsResponse> {
  const { q = "", siteId, bggId } = options;

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (siteId) params.set("siteId", siteId);
  if (bggId) params.set("bggId", bggId);

  const res = await apiFetch(`/api/products/grouped?${params}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch grouped products: ${res.status}`);
  }

  return res.json();
}

export async function fetchProductDetail(id: string): Promise<ProductDetail> {
  const res = await apiFetch(`/api/products/${encodeURIComponent(id)}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch product detail: ${res.status}`);
  }

  return res.json();
}

export async function fetchProductHistory(options: {
  productId: string;
  limit?: number;
}): Promise<ProductHistoryResponse> {
  const { productId, limit = 365 } = options;

  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(
    `/api/products/${encodeURIComponent(productId)}/history?${params}`,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch product history: ${res.status}`);
  }

  return res.json();
}

export async function fetchProductsMissingBgg(options: {
  limit?: number;
  offset?: number;
  adminApiKey: string;
}): Promise<ProductSearchResponse> {
  const { limit = 50, offset = 0, adminApiKey } = options;

  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await apiFetch(`/api/products/admin/missing-bgg?${params}`, {
    headers: { "x-admin-api-key": adminApiKey },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch products missing BGG ID: ${res.status}`);
  }

  return res.json();
}

export async function updateProductBggId(options: {
  productId: string;
  bggId: string | null;
  bggCanonicalName?: string | null;
  adminApiKey: string;
}): Promise<ProductDetail> {
  const { productId, bggId, bggCanonicalName, adminApiKey } = options;

  const res = await apiFetch(
    `/api/products/admin/${encodeURIComponent(productId)}/bgg`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": adminApiKey,
      },
      body: JSON.stringify({ bggId, bggCanonicalName }),
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to update product BGG ID: ${res.status}`);
  }

  return res.json();
}
