"use client";

import {
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
} from "@mui/material";
import { Container, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import type { ProductSummary } from "../../../lib/api/products";
import Watchlist from "../../../components/watchlist/Watchlist";
import { useProductSearch } from "../../../lib/hooks/useProductSearch";
import { useWatchlist } from "../../../lib/hooks/useWatchlist";

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

export default function ZatuUkPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const limit = 50;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { items: watchlist, toggleItem: toggleWatchlistItem } = useWatchlist();

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  const toggleWatchlist = (product: ProductSummary) => {
    toggleWatchlistItem(product.id, product.name);
  };

  const { data, isLoading, isError, error, isFetching } = useProductSearch({
    q: search,
    limit,
    offset,
    siteId: "board-game-co-uk",
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    setTotal(data.total);

    if (offset === 0) {
      setItems(data.items);
      return;
    }

    setItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const merged: ProductSummary[] = [...prev];
      for (const item of data.items) {
        if (!existingIds.has(item.id)) {
          merged.push(item);
        }
      }
      return merged;
    });
  }, [data, offset]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting) {
        return;
      }

      if (isLoading || isFetching || isError) {
        return;
      }

      if (items.length === 0 || items.length >= total) {
        return;
      }

      setOffset((prev) => prev + limit);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, isFetching, isError, items.length, total, limit]);

  const isInitialLoading = isLoading && offset === 0 && items.length === 0;
  const isLoadingMore =
    !isInitialLoading &&
    (isLoading || isFetching) &&
    items.length > 0 &&
    items.length < total;

  return (
    <Container maxWidth="lg">
      <Stack spacing={2} sx={{ py: 4 }}>
        <Typography variant="h3" component="h1">
          Zatu UK – Board Game Price Tracker
        </Typography>

        <Watchlist items={watchlist} limit={10} />

        <TextField
          size="small"
          label="Search by name"
          variant="outlined"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setOffset(0);
          }}
          fullWidth
        />

        {isInitialLoading && <Typography>Loading products...</Typography>}
        {isError && (
          <Typography color="error">
            Failed to load products: {error.message}
          </Typography>
        )}

        {!isError && (
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
              {items.map((product: ProductSummary) => {
                const isWatched = watchlist.some(
                  (item) => item.id === product.id,
                );

                return (
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
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant={isWatched ? "contained" : "outlined"}
                          size="small"
                          onClick={() => toggleWatchlist(product)}
                        >
                          {isWatched
                            ? "Remove from watchlist"
                            : "Add to watchlist"}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          component={Link}
                          href={`/items/zatu-uk/${product.id}`}
                        >
                          View details
                        </Button>
                      </Stack>
                    }
                  >
                    <ListItemAvatar>
                      <ProductAvatar product={product} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={product.name}
                      secondary={product.type}
                    />
                  </ListItem>
                );
              })}
            </List>
            <div ref={sentinelRef} />
            {isLoadingMore && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center" }}
              >
                Loading more products...
              </Typography>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
