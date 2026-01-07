export interface ProductSummary {
  id: string;
  name: string;
  type: string;
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

export async function fetchProducts(options: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<ProductSearchResponse> {
  const { q = "", limit = 50, offset = 0 } = options;

  const url = new URL("/api/products", window.location.origin);
  if (q) {
    url.searchParams.set("q", q);
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }

  return res.json();
}

export async function fetchProductDetail(id: string): Promise<ProductDetail> {
  const url = new URL(
    `/api/products/${encodeURIComponent(id)}`,
    window.location.origin
  );

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
    window.location.origin
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
