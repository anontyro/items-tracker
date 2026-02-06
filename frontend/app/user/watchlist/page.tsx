"use client";

import { Container, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import Watchlist from "../../../components/watchlist/Watchlist";

type WatchlistItem = {
  id: string;
  name: string;
};

export default function UserWatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("watchlist");
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === "string") {
          const simpleItems = (parsed as string[]).map((id) => ({
            id,
            name: id,
          }));
          setItems(simpleItems);
        } else {
          const richItems = parsed
            .filter((value: any) => value && typeof value.id === "string")
            .map((value: any) => ({
              id: value.id as string,
              name:
                typeof value.name === "string" && value.name.trim()
                  ? (value.name as string)
                  : (value.id as string),
            }));
          setItems(richItems);
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  }, []);

  const uniqueItems = Array.from(new Map(items.map((item) => [item.id, item])).values());

  return (
    <Container maxWidth="lg">
      <Stack spacing={2} sx={{ py: 4 }}>
        <Typography variant="h4" component="h1">
          Your watchlist
        </Typography>
        {uniqueItems.length === 0 ? (
          <Typography color="text.secondary">
            You have no items in your watchlist yet.
          </Typography>
        ) : (
          <Watchlist items={uniqueItems} />
        )}
      </Stack>
    </Container>
  );
}
