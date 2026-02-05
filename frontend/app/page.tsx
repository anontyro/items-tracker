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
import { useEffect, useState } from "react";

import Link from "next/link";
import type { ProductSummary } from "../lib/api/products";
import Watchlist from "../components/watchlist/Watchlist";
import { useProductSearch } from "../lib/hooks/useProductSearch";

type WatchlistItem = {
  id: string;
  name: string;
};

export default function HomePage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [hasLoadedWatchlist, setHasLoadedWatchlist] = useState(false);
  const limit = 50;

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  useEffect(() => {
    const stored = window.localStorage.getItem("watchlist");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === "string") {
            const items = (parsed as string[]).map((id) => ({
              id,
              name: id,
            }));
            setWatchlist(items);
          } else {
            const items = parsed
              .filter((value: any) => value && typeof value.id === "string")
              .map((value: any) => ({
                id: value.id as string,
                name:
                  typeof value.name === "string" && value.name.trim()
                    ? (value.name as string)
                    : (value.id as string),
              }));
            setWatchlist(items);
          }
        }
      } catch {
        // Ignore invalid JSON
      }
    }

    setHasLoadedWatchlist(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedWatchlist) {
      return;
    }
    window.localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist, hasLoadedWatchlist]);

  const toggleWatchlist = (product: ProductSummary) => {
    setWatchlist((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
        },
      ];
    });
  };

  const { data, isLoading, isError, error, isFetching } = useProductSearch({
    q: search,
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

        <Watchlist items={watchlist} />

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
                );
              })}
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
