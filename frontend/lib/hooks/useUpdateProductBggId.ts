"use client";

import { useMutation } from "@tanstack/react-query";
import { updateProductBggId, type ProductDetail } from "../api/products";

export interface UpdateProductBggIdParams {
  productId: string;
  bggId: string | null;
  bggCanonicalName?: string | null;
  adminApiKey: string;
}

export function useUpdateProductBggId() {
  return useMutation<ProductDetail, Error, UpdateProductBggIdParams>({
    mutationFn: (params) => updateProductBggId(params),
  });
}
