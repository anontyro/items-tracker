"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Link as MuiLink,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ItemHistory, { MultiSiteItemHistory } from "../ItemHistory/ItemHistory";
import type {
  ProductDetail,
  ProductHistoryResponse,
} from "../../../lib/api/products";
import { useEffect, useState } from "react";

import EditIcon from "@mui/icons-material/Edit";
import Image from "next/image";
import bggIcon from "../../../static/images/icons/bgg-icon.png";
import { useUpdateProductBggId } from "../../../lib/hooks/useUpdateProductBggId";
import zatuIcon from "../../../static/images/icons/zatu-logo-orange-white.png";

const formatDate = (value: string) => {
  const date = new Date(value);
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
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

type DetailTabProps = {
  product: ProductDetail;
  currentBggId: string | null;
  isEditingBgg: boolean;
  draftBggId: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  isSaving: boolean;
};

const DetailTab: React.FC<DetailTabProps> = ({
  product,
  currentBggId,
  isEditingBgg,
  draftBggId,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  isSaving,
}) => {
  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="subtitle1">Details</Typography>
        <Tooltip title={isEditingBgg ? "Cancel editing BGG ID" : "Edit BGG ID"}>
          <IconButton
            size="small"
            aria-label={isEditingBgg ? "Cancel editing BGG ID" : "Edit BGG ID"}
            onClick={isEditingBgg ? onCancelEdit : onStartEdit}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          Product ID: {product.id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Type: {product.type}
        </Typography>
        {!isEditingBgg && currentBggId && (
          <Typography variant="body2" color="text.secondary">
            BGG ID: {currentBggId}
          </Typography>
        )}
        {isEditingBgg && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 0.5 }}
          >
            <TextField
              size="small"
              label="BGG ID"
              variant="outlined"
              value={draftBggId}
              onChange={(event) => onDraftChange(event.target.value)}
              sx={{ maxWidth: 200 }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={onSaveEdit}
              disabled={isSaving}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={onCancelEdit}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </Stack>
        )}
        <Typography variant="body2" color="text.secondary">
          Created at: {formatDateTime(product.createdAt)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Updated at: {formatDateTime(product.updatedAt)}
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

const ItemDetails: React.FC<{
  product: ProductDetail;
  productId: string;
  productHistory: ProductHistoryResponse;
}> = ({ product, productHistory, productId }) => {
  const [tab, setTab] = useState(0);
  const [isWatched, setIsWatched] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentBggId, setCurrentBggId] = useState<string | null>(
    product.bggId ?? null,
  );
  const [isEditingBgg, setIsEditingBgg] = useState(false);
  const [draftBggId, setDraftBggId] = useState<string>(product.bggId ?? "");
  const [adminApiKey, setAdminApiKey] = useState<string | null>(null);

  const updateBggMutation = useUpdateProductBggId();

  const historyItems = productHistory?.items ?? [];
  const latestPoint = historyItems.length > 0 ? historyItems[0] : undefined;
  const previousPoint = historyItems.length > 1 ? historyItems[1] : undefined;

  let currentPriceLabel = "Price: Unknown";
  let priceTrendSymbol = "−";
  let priceTrendColor: string = "text.disabled";

  if (latestPoint) {
    const latestPrice = parseFloat(latestPoint.price);
    const formattedPrice = Number.isFinite(latestPrice)
      ? `£${latestPrice.toFixed(2)}`
      : latestPoint.price;

    currentPriceLabel = `Price: ${formattedPrice}`;

    if (previousPoint) {
      const previousPrice = parseFloat(previousPoint.price);
      if (Number.isFinite(previousPrice) && Number.isFinite(latestPrice)) {
        if (latestPrice > previousPrice) {
          priceTrendSymbol = "↑";
          priceTrendColor = "success.main";
        } else if (latestPrice < previousPrice) {
          priceTrendSymbol = "↓";
          priceTrendColor = "error.main";
        }
      }
    }
  }

  const availabilityStatus = latestPoint?.availability;
  let availabilityColor: string = "text.disabled";
  let availabilityLabel = "Availability unknown";

  if (availabilityStatus === true) {
    availabilityColor = "success.main";
    availabilityLabel = "In stock";
  } else if (availabilityStatus === false) {
    availabilityColor = "error.main";
    availabilityLabel = "Out of stock";
  }

  const sortedHistory = [...historyItems].sort((a, b) =>
    a.scrapedAt.localeCompare(b.scrapedAt),
  );

  const numericPoints = sortedHistory
    .map((point) => ({
      ...point,
      priceValue: parseFloat(point.price),
    }))
    .filter((point) => Number.isFinite(point.priceValue));

  let cheapestPriceLabel = "Cheapest price: Unknown";
  let highestPriceLabel = "Highest price: Unknown";
  let bestPurchaseLabel = "Best purchase date: Unknown";
  let outOfStockPercentLabel = "Time out of stock: Unknown";
  let restockGapLabel = "Average time between restocks: Unknown";

  if (numericPoints.length > 0) {
    const cheapest = numericPoints.reduce((min, p) =>
      p.priceValue < min.priceValue ? p : min,
    );
    const highest = numericPoints.reduce((max, p) =>
      p.priceValue > max.priceValue ? p : max,
    );

    cheapestPriceLabel = `Cheapest price: £${cheapest.priceValue.toFixed(
      2,
    )} on ${formatDate(cheapest.scrapedAt)}`;
    highestPriceLabel = `Highest price: £${highest.priceValue.toFixed(
      2,
    )} on ${formatDate(highest.scrapedAt)}`;

    const inStockCheapestCandidates = numericPoints.filter(
      (p) => p.availability === true,
    );
    const bestPoint =
      inStockCheapestCandidates.length > 0
        ? inStockCheapestCandidates.reduce((min, p) =>
            p.priceValue < min.priceValue ? p : min,
          )
        : cheapest;

    bestPurchaseLabel = `Best date to have purchased: £${bestPoint.priceValue.toFixed(
      2,
    )} on ${formatDate(bestPoint.scrapedAt)}${
      bestPoint.availability === true ? " (in stock)" : ""
    }`;

    const availabilityPoints = sortedHistory.filter(
      (p) => p.availability !== null,
    );
    if (availabilityPoints.length > 0) {
      const outOfStockCount = availabilityPoints.filter(
        (p) => p.availability === false,
      ).length;
      const percent = (outOfStockCount / availabilityPoints.length) * 100;
      outOfStockPercentLabel = `Time out of stock: ${percent.toFixed(1)}% of observations`;
    }

    const restockDates: Date[] = [];
    for (let i = 0; i < sortedHistory.length; i += 1) {
      const point = sortedHistory[i];
      const prev = sortedHistory[i - 1];
      if (
        point.availability === true &&
        (!prev || prev.availability === false)
      ) {
        restockDates.push(new Date(point.scrapedAt));
      }
    }

    if (restockDates.length >= 2) {
      let totalMs = 0;
      let count = 0;
      for (let i = 1; i < restockDates.length; i += 1) {
        const diff = restockDates[i].getTime() - restockDates[i - 1].getTime();
        if (diff > 0) {
          totalMs += diff;
          count += 1;
        }
      }
      if (count > 0) {
        const avgDays = totalMs / count / (1000 * 60 * 60 * 24);
        restockGapLabel = `Average time between restocks: ${avgDays.toFixed(
          1,
        )} days`;
      }
    }
  }

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedAdminKey = window.localStorage.getItem("adminApiKey");
    if (storedAdminKey) {
      setAdminApiKey(storedAdminKey);
    }
  }, []);

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

  const handleStartEditBgg = () => {
    if (typeof window !== "undefined" && !adminApiKey) {
      const key = window.prompt("Enter admin API key to edit BGG ID:");
      if (!key) {
        return;
      }
      setAdminApiKey(key);
      window.localStorage.setItem("adminApiKey", key);
    }

    setDraftBggId(currentBggId ?? "");
    setIsEditingBgg(true);
  };

  const handleCancelEditBgg = () => {
    setIsEditingBgg(false);
    setDraftBggId(currentBggId ?? "");
  };

  const handleSaveBgg = async () => {
    if (!adminApiKey) {
      return;
    }

    const trimmed = draftBggId.trim();
    const nextBggId = trimmed === "" ? null : trimmed;

    try {
      const updated = await updateBggMutation.mutateAsync({
        productId,
        bggId: nextBggId,
        adminApiKey,
      });
      setCurrentBggId(updated.bggId ?? null);
      setIsEditingBgg(false);
    } catch (error) {
      if (typeof window !== "undefined") {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        window.alert(`Failed to update BGG ID: ${message}`);
      }
      window.localStorage.removeItem("adminApiKey");
      setAdminApiKey(null);
    }
  };

  const handleToggleWatchlist = () => {
    setIsWatched((prev) => {
      const next = !prev;
      syncWatchlist(next);
      return next;
    });
  };

  const siteLinks =
    product.sources?.reduce(
      (acc, source) => {
        const siteId = source.additionalData?.siteId ?? source.sourceName;
        if (!siteId || acc.some((entry) => entry.siteId === siteId)) {
          return acc;
        }
        acc.push({
          siteId,
          siteName: source.sourceName,
          url: source.sourceUrl,
        });
        return acc;
      },
      [] as { siteId: string; siteName: string; url: string }[],
    ) ?? [];

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <Box
            sx={{
              width: "100%",
              aspectRatio: "4 / 3",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            {!imageError ? (
              <Box
                component="img"
                src={`/api/games/${product.id}/image`}
                alt={product.name}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={() => setImageError(true)}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "grey.200",
                }}
              >
                <Typography variant="h5" align="center">
                  {product.name}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 8,
          }}
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <Stack spacing={0.5} alignItems="flex-start">
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                First seen: {formatDate(product.createdAt)}
              </Typography>
              {latestPoint && (
                <Typography variant="body2" color="text.secondary">
                  Last updated: {formatDate(latestPoint.scrapedAt)}
                </Typography>
              )}
            </Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.5 }}
            >
              <Tooltip title={availabilityLabel}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: availabilityColor,
                  }}
                />
              </Tooltip>
              <Typography variant="body2" color="text.primary">
                {currentPriceLabel}
              </Typography>
              <Typography variant="body2" sx={{ color: priceTrendColor }}>
                {priceTrendSymbol}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              sx={{ mt: 1 }}
              spacing={1}
              alignItems="center"
            >
              {siteLinks.map((site) => {
                if (site.siteId === "board-game-co-uk") {
                  return (
                    <Tooltip title="View on Zatu" key={site.siteId}>
                      <IconButton
                        component={MuiLink}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{ p: 0.25 }}
                        aria-label="View on Zatu"
                      >
                        <Image
                          src={zatuIcon}
                          alt="Zatu link"
                          width={35}
                          height={20}
                        />
                      </IconButton>
                    </Tooltip>
                  );
                }

                if (site.siteId === "clownfish-games") {
                  return (
                    <Tooltip title="View on Clownfish Games" key={site.siteId}>
                      <IconButton
                        component={MuiLink}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{ p: 0.5 }}
                        aria-label="View on Clownfish Games"
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Clownfish
                        </Typography>
                      </IconButton>
                    </Tooltip>
                  );
                }

                return (
                  <Tooltip title={`View on ${site.siteName}`} key={site.siteId}>
                    <IconButton
                      component={MuiLink}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ p: 0.5 }}
                      aria-label={`View on ${site.siteName}`}
                    >
                      <Typography variant="body2">{site.siteName}</Typography>
                    </IconButton>
                  </Tooltip>
                );
              })}
              {currentBggId && (
                <Tooltip title="View on BoardGameGeek">
                  <IconButton
                    component={MuiLink}
                    href={`https://boardgamegeek.com/boardgame/${currentBggId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    sx={{ p: 0.25 }}
                    aria-label="View on BoardGameGeek"
                  >
                    <Image
                      src={bggIcon}
                      alt="BoardGameGeek link"
                      width={20}
                      height={20}
                    />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tab} onChange={(_event, newValue) => setTab(newValue)}>
          <Tab label="Details" />
          <Tab label="Pricing history" />
          <Tab label="Statistics" />
        </Tabs>
        <CardContent>
          {tab === 0 && (
            <DetailTab
              product={product}
              currentBggId={currentBggId}
              isEditingBgg={isEditingBgg}
              draftBggId={draftBggId}
              onDraftChange={setDraftBggId}
              onStartEdit={handleStartEditBgg}
              onCancelEdit={handleCancelEditBgg}
              onSaveEdit={handleSaveBgg}
              isSaving={updateBggMutation.isPending}
            />
          )}

          {tab === 1 && (
            <Box>
              {currentBggId ? (
                <MultiSiteItemHistory id={productId} bggId={currentBggId} />
              ) : (
                <ItemHistory id={productId} />
              )}
            </Box>
          )}

          {tab === 2 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Statistics
              </Typography>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  {cheapestPriceLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {highestPriceLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bestPurchaseLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {restockGapLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {outOfStockPercentLabel}
                </Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ItemDetails;
