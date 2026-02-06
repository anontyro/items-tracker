"use client";

import {
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  Link as MuiLink,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import ItemHistory from "../ItemHistory/ItemHistory";
import type { ProductDetail } from "../../../lib/api/products";

type DetailTabProps = {
  product: ProductDetail;
};

const DetailTab: React.FC<DetailTabProps> = ({ product }) => {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Details
      </Typography>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          Product ID: {product.id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Type: {product.type}
        </Typography>
        {product.bggId && (
          <Typography variant="body2" color="text.secondary">
            BGG ID: {product.bggId}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Created at: {new Date(product.createdAt).toLocaleString()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Updated at: {new Date(product.updatedAt).toLocaleString()}
        </Typography>
      </Stack>

      {product.sources && product.sources.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sources
          </Typography>
          <Stack spacing={1}>
            {product.sources.map((source) => (
              <Box key={source.id}>
                <MuiLink
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                >
                  {source.sourceName}
                </MuiLink>
                {source.sku && (
                  <Typography variant="body2" color="text.secondary">
                    SKU: {source.sku}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

type WatchlistItem = {
  id: string;
  name: string;
};

const ItemDetails: React.FC<{ product: ProductDetail; productId: string }> = ({
  product,
  productId,
}) => {
  const [tab, setTab] = useState(0);
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem("watchlist");
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === "string") {
          setIsWatched((parsed as string[]).includes(productId));
        } else {
          const items = parsed.filter(
            (value: any) => value && typeof value.id === "string",
          ) as WatchlistItem[];
          setIsWatched(items.some((item) => item.id === productId));
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  }, [productId]);

  const syncWatchlist = (nextWatched: boolean) => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem("watchlist");
    let items: WatchlistItem[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === "string") {
            items = (parsed as string[]).map((id) => ({ id, name: id }));
          } else {
            items = parsed.filter(
              (value: any) => value && typeof value.id === "string",
            ) as WatchlistItem[];
          }
        }
      } catch {
        // Ignore invalid JSON
      }
    }

    if (nextWatched) {
      if (!items.some((item) => item.id === productId)) {
        items.push({ id: productId, name: product.name });
      }
    } else {
      items = items.filter((item) => item.id !== productId);
    }

    window.localStorage.setItem("watchlist", JSON.stringify(items));
  };

  const handleToggleWatchlist = () => {
    setIsWatched((prev) => {
      const next = !prev;
      syncWatchlist(next);
      return next;
    });
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              width: "100%",
              aspectRatio: "4 / 3",
              bgcolor: "grey.200",
              borderRadius: 1,
            }}
          />
        </Grid>
        <Grid
          item
          xs={12}
          md={8}
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <Stack spacing={0.5} alignItems="flex-start">
            <Typography variant="body1" color="text.secondary">
              Type: {product.type}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              First seen: {new Date(product.createdAt).toLocaleDateString()}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Typography variant="h4" sx={{ mb: 0 }}>
                {product.name}
              </Typography>
              <Tooltip
                title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
              >
                <IconButton
                  aria-label={
                    isWatched ? "Remove from watchlist" : "Add to watchlist"
                  }
                  size="small"
                  onClick={handleToggleWatchlist}
                >
                  <Typography
                    variant="h6"
                    color={isWatched ? "warning.main" : "disabled"}
                    sx={{ lineHeight: 1 }}
                  >
                    {isWatched ? "★" : "☆"}
                  </Typography>
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tab} onChange={(_event, newValue) => setTab(newValue)}>
          <Tab label="Details" />
          <Tab label="Pricing history" />
        </Tabs>
        <CardContent>
          {tab === 0 && <DetailTab product={product} />}

          {tab === 1 && (
            <Box>
              <ItemHistory id={productId} />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ItemDetails;
