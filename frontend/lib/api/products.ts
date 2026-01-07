export interface ProductSummary {
  id: string;
  name: string;
  type: string;
}

export interface ProductSearchResponse {
  items: ProductSummary[];
  total: number;
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
