"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProductDetail, type ProductDetail } from "../api/products";

export function useProductDetail(id: string | undefined) {
  return useQuery<ProductDetail, Error>({
    queryKey: ["product", id],
    queryFn: () => {
      if (!id) {
        throw new Error("Product id is required");
      }
      return fetchProductDetail(id);
    },
    enabled: !!id,
  });
}
