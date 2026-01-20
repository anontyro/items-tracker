"use client";

import { Button, List, ListItem, ListItemText } from "@mui/material";
import { Container, Stack, Typography } from "@mui/material";

import Link from "next/link";
import type { ProductSummary } from "../lib/api/products";
import { useProductSearch } from "../lib/hooks/useProductSearch";
import { useState } from "react";

export default function HomePage() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading, isError, error, isFetching } = useProductSearch({
    q: "",
    limit,
    offset,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Container maxWidth="lg">
      <Stack spacing={2} sx={{ py: 4 }}>
        <Typography variant="h3" component="h1">
          Board Game Price Tracker
        </Typography>

        {isLoading && <Typography>Loading products...</Typography>}
        {isError && (
          <Typography color="error">
            Failed to load products: {error.message}
          </Typography>
        )}

        {!isLoading && !isError && (
          <>
            <Typography variant="body2" color="text.secondary">
              Showing {items.length} of {total} products (page offset {offset})
            </Typography>

            <List dense>
              {items.map((product: ProductSummary) => (
                <ListItem key={product.id} disableGutters>
                  <ListItemText
                    primary={product.name}
                    secondary={product.type}
                  />
                  <Button
                    component={Link}
                    href={`/items/zatu-uk/${product.id}`}
                  >
                    View Details
                  </Button>
                </ListItem>
              ))}
            </List>

            <Button
              variant="outlined"
              disabled={items.length === 0 || items.length + offset >= total}
              onClick={() => setOffset((prev) => prev + limit)}
            >
              {isFetching ? "Loading..." : "Load more"}
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}
