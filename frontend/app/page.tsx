"use client";

import {
  Avatar,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import { Container, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import type { ProductSummary } from "../lib/api/products";
import Watchlist from "../components/watchlist/Watchlist";
import { useProductSearch } from "../lib/hooks/useProductSearch";

type WatchlistItem = {
  id: string;
  name: string;
};

type SiteOption = {
  siteId: string;
  label: string;
  href: string;
};

const SITE_ROUTE_CONFIG: Record<
  string,
  {
    slug: string;
    label: string;
  }
> = {
  "board-game-co-uk": {
    slug: "zatu-uk",
    label: "Zatu UK",
  },
  "clownfish-games": {
    slug: "clownfish-games",
    label: "Clownfish Games",
  },
};

function getSiteOptions(product: ProductSummary): SiteOption[] {
  const sources = product.sources ?? [];
  const seen = new Set<string>();
  const options: SiteOption[] = [];

  for (const source of sources) {
    const data = source.additionalData as
      | { siteId?: string | null }
      | null
      | undefined;
    const siteId = data?.siteId ?? undefined;
    if (!siteId || seen.has(siteId)) {
      continue;
    }
    seen.add(siteId);

    const config = SITE_ROUTE_CONFIG[siteId] ?? {
      slug: "zatu-uk",
      label: source.sourceName || siteId,
    };

    options.push({
      siteId,
      label: config.label,
      href: `/items/${config.slug}/${product.id}`,
    });
  }

  return options;
}

type ProductActionsProps = {
  product: ProductSummary;
  isWatched: boolean;
  onToggleWatchlist: () => void;
};

const ProductActions: React.FC<ProductActionsProps> = ({
  product,
  isWatched,
  onToggleWatchlist,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const siteOptions = getSiteOptions(product);

  let primaryHref: string | undefined;
  let primaryLabel = "View details";

  if (siteOptions.length === 1) {
    primaryHref = siteOptions[0].href;
    primaryLabel = `View on ${siteOptions[0].label}`;
  } else if (siteOptions.length === 0) {
    // Fallback to the original Zatu route when we don't have explicit site information.
    primaryHref = `/items/zatu-uk/${product.id}`;
  }

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant={isWatched ? "contained" : "outlined"}
        size="small"
        onClick={onToggleWatchlist}
      >
        {isWatched ? "Remove from watchlist" : "Add to watchlist"}
      </Button>

      {siteOptions.length <= 1 ? (
        <Button
          variant="outlined"
          size="small"
          component={Link}
          href={primaryHref!}
        >
          {primaryLabel}
        </Button>
      ) : (
        <>
          <IconButton
            size="small"
            aria-label="View details on retailer sites"
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
          >
            {siteOptions.map((option) => (
              <MenuItem
                key={option.siteId}
                component={Link}
                href={option.href}
                onClick={() => setAnchorEl(null)}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Stack>
  );
};

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

export default function HomePage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [hasLoadedWatchlist, setHasLoadedWatchlist] = useState(false);
  const limit = 50;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const aggregateProducts = (
    itemsToAggregate: ProductSummary[],
  ): ProductSummary[] => {
    const byKey = new Map<string, ProductSummary>();

    for (const product of itemsToAggregate) {
      const key = (product as any).bggId ?? null;
      const groupingKey = key ?? product.id;

      const existing = byKey.get(groupingKey);

      const sources = product.sources ?? [];

      if (!existing) {
        byKey.set(groupingKey, {
          ...product,
          sources: sources,
        });
        continue;
      }

      const existingSources = existing.sources ?? [];
      const mergedSourceMap = new Map<
        string,
        (typeof existingSources)[number]
      >();
      for (const source of existingSources) {
        mergedSourceMap.set(source.id, source);
      }
      for (const source of sources) {
        if (!mergedSourceMap.has(source.id)) {
          mergedSourceMap.set(source.id, source);
        }
      }

      byKey.set(groupingKey, {
        ...existing,
        sources: Array.from(mergedSourceMap.values()),
      });
    }

    return Array.from(byKey.values());
  };

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

  useEffect(() => {
    if (!data) {
      return;
    }

    setTotal(data.total);

    const aggregatedPageItems = aggregateProducts(data.items);

    if (offset === 0) {
      setItems(aggregatedPageItems);
      return;
    }

    setItems((prev) => {
      const aggregated = aggregateProducts([...prev, ...aggregatedPageItems]);
      return aggregated;
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

      if (items.length === 0) {
        return;
      }

      if (offset + limit >= total) {
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
          Board Game Price Tracker
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
                      <ProductActions
                        product={product}
                        isWatched={isWatched}
                        onToggleWatchlist={() => toggleWatchlist(product)}
                      />
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
