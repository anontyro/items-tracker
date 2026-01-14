"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchProductsMissingBgg,
  type ProductSearchResponse,
} from "../api/products";

export interface UseProductsMissingBggParams {
  limit?: number;
  offset?: number;
  adminApiKey: string;
}

export function useProductsMissingBgg(params: UseProductsMissingBggParams) {
  const { limit = 50, offset = 0, adminApiKey } = params;

  return useQuery<ProductSearchResponse, Error>({
    queryKey: ["products-missing-bgg", { limit, offset }],
    queryFn: () => fetchProductsMissingBgg({ limit, offset, adminApiKey }),
    enabled: !!adminApiKey,
  });
}
