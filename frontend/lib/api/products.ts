export interface ProductSummary {
  id: string;
  name: string;
  type: string;
  sources?: ProductSourceSummary[];
}

export interface ProductSearchResponse {
  items: ProductSummary[];
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
  scrapedAt: string;
}

export interface ProductHistoryResponse {
  items: PriceHistoryPoint[];
}

const getBaseUrl = () => {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL
      : window.location.origin;

  return baseUrl;
};

export async function fetchProducts(options: {
  q?: string;
  limit?: number;
  offset?: number;
  siteId?: string;
}): Promise<ProductSearchResponse> {
  const { q = "", limit = 50, offset = 0, siteId } = options;

  const url = new URL("/api/products", getBaseUrl());
  if (q) {
    url.searchParams.set("q", q);
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (siteId) {
    url.searchParams.set("siteId", siteId);
  }

  console.log("url is", url.toString());

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }

  return res.json();
}

export async function fetchProductDetail(id: string): Promise<ProductDetail> {
  const url = new URL(`/api/products/${encodeURIComponent(id)}`, getBaseUrl());

  console.log("url is", url.toString());

  const res = await fetch(url.toString(), {
    method: "GET",
  });

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

  const url = new URL(
    `/api/products/${encodeURIComponent(productId)}/history`,
    getBaseUrl(),
  );

  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    method: "GET",
  });

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

  const url = new URL("/api/products/admin/missing-bgg", getBaseUrl());

  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-admin-api-key": adminApiKey,
    },
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

  const url = new URL(
    `/api/products/admin/${encodeURIComponent(productId)}/bgg`,
    getBaseUrl(),
  );

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-api-key": adminApiKey,
    },
    body: JSON.stringify({ bggId, bggCanonicalName }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update product BGG ID: ${res.status}`);
  }

  return res.json();
}
