"use client";

import {
  PriceHistoryPoint,
  ProductHistoryResponse,
} from "../../../lib/api/products";
import { useEffect, useState } from "react";

import { useProductHistory } from "../../../lib/hooks/useProductHistory";

type ItemHistoryProps = {
  id: string;
};

const ItemHistory: React.FC<ItemHistoryProps> = ({ id }) => {
  const { data: productHistory } = useProductHistory({ productId: id });

  if (!productHistory) {
    return <div>Loading...</div>;
  }

  console.log("productHistory is", productHistory);

  return <div>ItemHistory {id}</div>;
};

export default ItemHistory;
