"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchProductHistory,
  type PriceHistoryPoint,
  type ProductHistoryResponse,
} from "../api/products";

export interface UseProductHistoryParams {
  productId?: string;
  limit?: number;
}

export function useProductHistory(params: UseProductHistoryParams) {
  const { productId, limit = 365 } = params;

  return useQuery<ProductHistoryResponse, Error>({
    queryKey: ["product-history", { productId, limit }],
    queryFn: () => {
      if (!productId) {
        throw new Error("productId is required");
      }
      return fetchProductHistory({ productId, limit });
    },
    enabled: !!productId,
  });
}
