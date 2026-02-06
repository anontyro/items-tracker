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

export default ItemHistory;
