"use client";

import {
  ProductSearchResponse,
  ProductSummary,
  fetchProducts,
} from "../api/products";

import { useQuery } from "@tanstack/react-query";

export interface UseProductSearchParams {
  q?: string;
  limit?: number;
  offset?: number;
  siteId?: string;
}

export function useProductSearch(params: UseProductSearchParams) {
  const { q = "", limit = 50, offset = 0, siteId } = params;

  return useQuery<ProductSearchResponse, Error>({
    queryKey: ["products", { q, limit, offset, siteId }],
    queryFn: () => fetchProducts({ q, limit, offset, siteId }),
  });
}
