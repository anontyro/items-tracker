"use client";

import {
  Avatar,
  Box,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";

import type { ProductSummary } from "../../lib/api/products";
import { useState } from "react";

interface ProductListItemProps {
  product: ProductSummary;
  primaryText?: string;
  secondaryText?: string;
  actions: React.ReactNode;
}

function ProductAvatar({ product }: { product: ProductSummary }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Avatar variant="rounded" sx={{ width: 56, height: 56, mr: 2 }}>
        {product.name.charAt(0)}
      </Avatar>
    );
  }

  return (
    <Avatar
      variant="rounded"
      sx={{ width: 56, height: 56, mr: 2 }}
      src={`/api/games/${product.id}/image`}
      alt={product.name}
      imgProps={{
        onError: () => setHasError(true),
      }}
    >
      {product.name.charAt(0)}
    </Avatar>
  );
}

export function ProductListItem({
  product,
  primaryText,
  secondaryText,
  actions,
}: ProductListItemProps) {
  return (
    <ListItem
      disableGutters
      sx={{
        mb: 1,
        px: 2,
        py: 1.5,
        borderRadius: 1,
        bgcolor: "background.paper",
        boxShadow: 1,
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      <ListItemAvatar>
        <ProductAvatar product={product} />
      </ListItemAvatar>
      <ListItemText
        primary={primaryText ?? product.name}
        secondary={secondaryText ?? product.type}
        sx={{ mr: 2 }}
      />
      <Box sx={{ flexShrink: 0 }}>{actions}</Box>
    </ListItem>
  );
}
