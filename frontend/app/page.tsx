"use client";

import {
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
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

            <List
              dense
              sx={{
                width: "100%",
                bgcolor: "background.default",
              }}
            >
              {items.map((product: ProductSummary) => (
                <ListItem
                  key={product.id}
                  disableGutters
                  sx={{
                    mb: 1,
                    px: 2,
                    py: 1.5,
                    borderRadius: 1,
                    bgcolor: "background.paper",
                    boxShadow: 1,
                  }}
                  secondaryAction={
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      href={`/items/zatu-uk/${product.id}`}
                    >
                      View details
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      sx={{ width: 56, height: 56, mr: 2 }}
                    >
                      {product.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={product.name}
                    secondary={product.type}
                  />
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
