"use client";

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Fragment, useEffect, useState } from "react";
import {
  fetchGroupedProducts,
  fetchProductHistory,
} from "../../../lib/api/products";

import type { PriceHistoryPoint } from "../../../lib/api/products";
import { useProductHistory } from "../../../lib/hooks/useProductHistory";

type ItemHistoryProps = {
  id: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes} UTC`;
};

const ItemHistory: React.FC<ItemHistoryProps> = ({ id }) => {
  const {
    data: productHistory,
    isLoading,
    isError,
    error,
  } = useProductHistory({
    productId: id,
  });

  if (isLoading && !productHistory) {
    return <Typography>Loading pricing history...</Typography>;
  }

  if (isError) {
    return (
      <Typography color="error">
        Failed to load pricing history{error ? `: ${error.message}` : ""}
      </Typography>
    );
  }

  if (!productHistory || !productHistory.items.length) {
    return <Typography>No pricing history available.</Typography>;
  }

  const numericPoints: (PriceHistoryPoint & { priceValue: number })[] =
    productHistory.items
      .map((point) => ({
        ...point,
        priceValue: parseFloat(point.price),
      }))
      .filter((point) => Number.isFinite(point.priceValue))
      .sort((a, b) => a.scrapedAt.localeCompare(b.scrapedAt));

  const hasPrices = numericPoints.length > 0;

  let trendLabel = "Price trend: Unknown";
  let trendValue: number | null = null;

  if (numericPoints.length >= 2) {
    const first = numericPoints[0].priceValue;
    const last = numericPoints[numericPoints.length - 1].priceValue;
    trendValue = last - first;
    if (trendValue > 0) {
      trendLabel = `Price trend: ↑ +£${Math.abs(trendValue).toFixed(2)} over period`;
    } else if (trendValue < 0) {
      trendLabel = `Price trend: ↓ -£${Math.abs(trendValue).toFixed(2)} over period`;
    } else {
      trendLabel = "Price trend: − no net change over period";
    }
  }

  let chartPoints = "";
  if (hasPrices) {
    const prices = numericPoints.map((p) => p.priceValue);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const count = numericPoints.length;

    chartPoints = numericPoints
      .map((point, index) => {
        const x = count === 1 ? 50 : (index / (count - 1)) * 100;
        const normalized = (point.priceValue - min) / span;
        const y = 90 - normalized * 70; // keep some padding top/bottom
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Price trend
        </Typography>
        {hasPrices ? (
          <Box
            sx={{
              height: 260,
              borderRadius: 1,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              p: 2,
            }}
          >
            <Box sx={{ height: "80%", color: "primary.main" }}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%" }}
              >
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  points={chartPoints}
                />
              </svg>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {trendLabel}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No numeric price data available to display chart.
          </Typography>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Pricing history
        </Typography>
        <Paper
          variant="outlined"
          sx={{ maxHeight: 320, overflow: "auto", borderRadius: 1 }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>RRP</TableCell>
                <TableCell>Availability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productHistory.items
                .slice()
                .sort((a, b) => b.scrapedAt.localeCompare(a.scrapedAt))
                .map((point) => {
                  let availabilityLabel = "Unknown";
                  if (point.availability === true) {
                    availabilityLabel = "In stock";
                  } else if (point.availability === false) {
                    availabilityLabel = "Out of stock";
                  }

                  return (
                    <TableRow key={point.id} hover>
                      <TableCell>{formatDateTime(point.scrapedAt)}</TableCell>
                      <TableCell>£{point.price}</TableCell>
                      <TableCell>
                        {point.rrp !== null ? `£${point.rrp}` : "—"}
                      </TableCell>
                      <TableCell>{availabilityLabel}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );
};

type MultiSiteItemHistoryProps = {
  id: string;
  bggId: string;
};

type SiteSeries = {
  siteId: string;
  siteName: string;
  color: string;
  numericPoints: (PriceHistoryPoint & { priceValue: number })[];
};

export const MultiSiteItemHistory: React.FC<MultiSiteItemHistoryProps> = ({
  id,
  bggId,
}) => {
  const [siteSeries, setSiteSeries] = useState<SiteSeries[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const grouped = await fetchGroupedProducts({ bggId });
        const group =
          grouped.items.find((g) =>
            g.products.some((product) => product.id === id),
          ) ?? grouped.items[0];

        if (!group) {
          if (!cancelled) {
            setSiteSeries([]);
          }
          return;
        }

        const sourceById = new Map(
          group.sources.map((source) => [source.id, source]),
        );

        const historyByProduct = await Promise.all(
          group.products.map(async (product) => {
            const history = await fetchProductHistory({
              productId: product.id,
            });
            return { productId: product.id, history };
          }),
        );

        const sitesMap = new Map<
          string,
          {
            siteId: string;
            siteName: string;
            points: PriceHistoryPoint[];
          }
        >();

        for (const { history } of historyByProduct) {
          for (const point of history.items) {
            const source = sourceById.get(point.sourceId);
            const siteId =
              (source?.additionalData && source.additionalData.siteId) ||
              source?.sourceName ||
              "unknown";
            const siteName = source?.sourceName || siteId;

            const key = siteId;
            let entry = sitesMap.get(key);
            if (!entry) {
              entry = { siteId, siteName, points: [] };
              sitesMap.set(key, entry);
            }
            entry.points.push(point);
          }
        }

        const colors = ["#1976d2", "#d32f2f", "#2e7d32", "#f57c00", "#7b1fa2"];

        const series: SiteSeries[] = Array.from(sitesMap.values()).map(
          (entry, index) => {
            const numericPoints = entry.points
              .map((point) => ({
                ...point,
                priceValue: parseFloat(point.price),
              }))
              .filter((point) => Number.isFinite(point.priceValue))
              .sort((a, b) => a.scrapedAt.localeCompare(b.scrapedAt));

            return {
              siteId: entry.siteId,
              siteName: entry.siteName,
              color: colors[index % colors.length],
              numericPoints,
            };
          },
        );

        if (!cancelled) {
          setSiteSeries(series);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setSiteSeries([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (bggId) {
      void load();
    } else {
      setIsLoading(false);
      setSiteSeries([]);
    }

    return () => {
      cancelled = true;
    };
  }, [bggId, id]);

  if (isLoading && !siteSeries.length) {
    return <Typography>Loading multi-site pricing history...</Typography>;
  }

  if (error) {
    return (
      <Typography color="error">
        Failed to load multi-site pricing history: {error.message}
      </Typography>
    );
  }

  const allNumericPoints = siteSeries.flatMap((series) => series.numericPoints);
  const hasPrices = allNumericPoints.length > 0;

  let chartSeries: {
    siteId: string;
    siteName: string;
    color: string;
    points: string;
  }[] = [];

  if (hasPrices) {
    const prices = allNumericPoints.map((p) => p.priceValue);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;

    chartSeries = siteSeries.map((series) => {
      const count = series.numericPoints.length;
      const points = series.numericPoints
        .map((point, index) => {
          const x = count === 1 ? 50 : (index / (count - 1)) * 100;
          const normalized = (point.priceValue - min) / span;
          const y = 90 - normalized * 70;
          return `${x},${y}`;
        })
        .join(" ");

      return {
        siteId: series.siteId,
        siteName: series.siteName,
        color: series.color,
        points,
      };
    });
  }

  const rowsBySite = siteSeries.map((series) => {
    const rows = series.numericPoints
      .slice()
      .sort((a, b) => b.scrapedAt.localeCompare(a.scrapedAt));
    return { series, rows };
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Price trends by site
        </Typography>
        {hasPrices ? (
          <Box
            sx={{
              height: 260,
              borderRadius: 1,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              p: 2,
            }}
          >
            <Box sx={{ height: "80%" }}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%" }}
              >
                {chartSeries.map((series) => (
                  <polyline
                    key={series.siteId}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={1.5}
                    points={series.points}
                  />
                ))}
              </svg>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing price history for {siteSeries.length} site
                {siteSeries.length === 1 ? "" : "s"}.
              </Typography>
              <Box sx={{ mt: 0.5, display: "flex", gap: 2, flexWrap: "wrap" }}>
                {siteSeries.map((series) => (
                  <Box
                    key={series.siteId}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: series.color,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {series.siteName}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No numeric price data available to display chart.
          </Typography>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Pricing history by site
        </Typography>
        <Paper
          variant="outlined"
          sx={{ maxHeight: 320, overflow: "auto", borderRadius: 1 }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Site</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>RRP</TableCell>
                <TableCell>Availability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rowsBySite.map(({ series, rows }) => (
                <Fragment key={series.siteId}>
                  <TableRow key={`${series.siteId}-header`}>
                    <TableCell colSpan={5} sx={{ fontWeight: 600 }}>
                      {series.siteName}
                    </TableCell>
                  </TableRow>
                  {rows.map((point) => {
                    let availabilityLabel = "Unknown";
                    if (point.availability === true) {
                      availabilityLabel = "In stock";
                    } else if (point.availability === false) {
                      availabilityLabel = "Out of stock";
                    }

                    return (
                      <TableRow key={point.id} hover>
                        <TableCell>{formatDateTime(point.scrapedAt)}</TableCell>
                        <TableCell>{series.siteName}</TableCell>
                        <TableCell>£{point.price}</TableCell>
                        <TableCell>
                          {point.rrp !== null ? `£${point.rrp}` : "—"}
                        </TableCell>
                        <TableCell>{availabilityLabel}</TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );
};

export default ItemHistory;
