"use client";

import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import type { PriceHistoryPoint, ProductSummary } from "../../lib/api/products";

import Link from "next/link";
import { useProductHistory } from "../../lib/hooks/useProductHistory";

interface WatchlistProps {
  productIds: string[];
  productsById: Record<string, ProductSummary | undefined>;
}

interface SparklineProps {
  history: PriceHistoryPoint[];
}

function Sparkline({ history }: SparklineProps) {
  if (!history.length) {
    return null;
  }

  const prices = history
    .slice()
    .reverse()
    .map((point) => Number(point.price));

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const width = 100;
  const height = 40;

  const points = prices.map((price, index) => {
    const x = (index / Math.max(prices.length - 1, 1)) * width;
    const y = height - ((price - min) / range) * height;
    return `${x},${y}`;
  });

  const pointsAttr = points.join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={pointsAttr}
      />
    </svg>
  );
}

function PriceTrend({ history }: { history: PriceHistoryPoint[] }) {
  if (history.length < 2) {
    return null;
  }

  const latest = history[0];
  const previous = history[1];

  const latestPrice = Number(latest.price);
  const previousPrice = Number(previous.price);

  if (!Number.isFinite(latestPrice) || !Number.isFinite(previousPrice)) {
    return null;
  }

  const direction = latestPrice - previousPrice;

  if (direction < 0) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2" color="error">
          ↓ Price down
        </Typography>
      </Stack>
    );
  }

  if (direction > 0) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2" color="success.main">
          ↑ Price up
        </Typography>
      </Stack>
    );
  }

  return null;
}

function WatchlistCard({
  productId,
  product,
}: {
  productId: string;
  product?: ProductSummary;
}) {
  const { data, isLoading } = useProductHistory({ productId, limit: 30 });

  const history = (data?.items ?? [])
    .slice()
    .sort((a, b) => (a.scrapedAt < b.scrapedAt ? 1 : -1));

  const latest = history[0];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography
            variant="subtitle1"
            noWrap
            component={Link}
            href={`/items/zatu-uk/${productId}`}
            sx={{
              textDecoration: "none",
              color: "primary.main",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            {product?.name ?? productId}
          </Typography>

          {latest && (
            <Typography variant="h6">
              £{Number(latest.price).toFixed(2)}
            </Typography>
          )}

          {history.length > 1 && <Sparkline history={history} />}

          <PriceTrend history={history} />
        </Stack>
      </CardContent>
    </Card>
  );
}

const Watchlist: React.FC<WatchlistProps> = ({ productIds, productsById }) => {
  const uniqueIds = Array.from(new Set(productIds));

  if (!uniqueIds.length) {
    return null;
  }

  return (
    <Stack spacing={1}>
      <Typography variant="h6">Watchlist</Typography>
      <Grid container spacing={2}>
        {uniqueIds.map((id) => (
          <Grid key={id} item xs={12} sm={6} md={4} lg={3}>
            <WatchlistCard productId={id} product={productsById[id]} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default Watchlist;
