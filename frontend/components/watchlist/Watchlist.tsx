"use client";

import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";

import Image from "next/image";
import Link from "next/link";
import type { PriceHistoryPoint } from "../../lib/api/products";
import clownfishIcon from "../../static/images/icons/clownfish-icon.png";
import { useProductDetail } from "../../lib/hooks/useProductDetail";
import { useProductHistory } from "../../lib/hooks/useProductHistory";
import zatuIcon from "../../static/images/icons/zatu-logo-orange-white.png";

type WatchlistItem = {
  id: string;
  name: string;
};

interface WatchlistProps {
  items: WatchlistItem[];
  limit?: number;
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

type PrimarySite = {
  slug: string;
  siteId: string | null;
};

function resolvePrimarySite(product: any | undefined): PrimarySite {
  if (!product) {
    return { slug: "zatu-uk", siteId: null };
  }

  const sources = (product.sources ?? []) as
    | { additionalData?: any }[]
    | undefined;

  if (!sources || sources.length === 0) {
    return { slug: "zatu-uk", siteId: null };
  }

  let hasZatu = false;
  let hasClownfish = false;

  for (const source of sources) {
    const data = source.additionalData as
      | { siteId?: string | null }
      | null
      | undefined;
    const siteId = data?.siteId ?? undefined;
    if (!siteId) {
      continue;
    }

    if (siteId === "board-game-co-uk") {
      hasZatu = true;
      break;
    }
    if (siteId === "clownfish-games") {
      hasClownfish = true;
    }
  }

  if (hasZatu) {
    return { slug: "zatu-uk", siteId: "board-game-co-uk" };
  }
  if (hasClownfish) {
    return { slug: "clownfish-games", siteId: "clownfish-games" };
  }

  return { slug: "zatu-uk", siteId: null };
}

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const { data: historyData } = useProductHistory({
    productId: item.id,
    limit: 30,
  });
  const { data: productDetail } = useProductDetail(item.id);

  const history = (historyData?.items ?? [])
    .slice()
    .sort((a, b) => (a.scrapedAt < b.scrapedAt ? 1 : -1));

  const latest = history[0];
  const primary = resolvePrimarySite(productDetail);

  return (
    <Card
      sx={{
        width: "200px",
        height: "200px",
      }}
      variant="outlined"
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Stack spacing={1} sx={{ flexGrow: 1 }}>
          <Typography
            variant="subtitle1"
            noWrap
            component={Link}
            href={`/items/${primary.slug}/${item.id}`}
            sx={{
              textDecoration: "none",
              color: "primary.main",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            {item.name}
          </Typography>

          {latest && (
            <Typography variant="h6">
              £{Number(latest.price).toFixed(2)}
            </Typography>
          )}

          {history.length > 1 && <Sparkline history={history} />}

          <PriceTrend history={history} />
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-start"
          sx={{ mt: 1 }}
        >
          {primary.siteId === "board-game-co-uk" && (
            <Image
              src={zatuIcon}
              alt="Zatu"
              width={32}
              height={18}
              style={{ borderRadius: 2 }}
            />
          )}
          {primary.siteId === "clownfish-games" && (
            <Image
              src={clownfishIcon}
              alt="Clownfish Games"
              width={32}
              height={18}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

const Watchlist: React.FC<WatchlistProps> = ({ items, limit }) => {
  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.id, item])).values(),
  ).slice(0, limit);

  if (!uniqueItems.length) {
    return null;
  }

  return (
    <Stack spacing={1}>
      <Typography variant="h6">Watchlist</Typography>
      <Grid container spacing={2}>
        {uniqueItems.map((item) => (
          <Grid key={item.id}>
            <WatchlistCard item={item} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default Watchlist;
