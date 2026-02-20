"use client";

import { useCallback, useEffect, useState } from "react";

export type WatchlistItem = {
  id: string;
  name: string;
};

export const WATCHLIST_STORAGE_KEY = "watchlist";

export function parseWatchlist(raw: string | null): WatchlistItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const items: WatchlistItem[] = [];

    if (parsed.length > 0 && typeof parsed[0] === "string") {
      for (const value of parsed) {
        if (typeof value === "string") {
          items.push({ id: value, name: value });
        }
      }
    } else {
      for (const value of parsed) {
        if (!value || typeof value !== "object") {
          continue;
        }
        const id = (value as any).id;
        if (typeof id !== "string") {
          continue;
        }
        const nameRaw = (value as any).name;
        const name =
          typeof nameRaw === "string" && nameRaw.trim() ? nameRaw : id;
        items.push({ id, name });
      }
    }

    const unique = Array.from(new Map(items.map((i) => [i.id, i])).values());
    return unique;
  } catch {
    return [];
  }
}

export function serializeWatchlist(items: WatchlistItem[]): string {
  const unique = Array.from(new Map(items.map((i) => [i.id, i])).values());
  const payload = unique.map((item) => ({ id: item.id, name: item.name }));
  return JSON.stringify(payload);
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    const parsed = parseWatchlist(raw);
    setItems(parsed);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded || typeof window === "undefined") {
      return;
    }

    try {
      const json = serializeWatchlist(items);
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, json);
    } catch {
      // Ignore serialization errors
    }
  }, [items, hasLoaded]);

  const addItem = useCallback((item: WatchlistItem) => {
    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      map.set(item.id, item);
      return Array.from(map.values());
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleItem = useCallback((id: string, name: string) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      if (exists) {
        return prev.filter((i) => i.id !== id);
      }
      return [...prev, { id, name }];
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const replaceAll = useCallback((next: WatchlistItem[]) => {
    setItems(() => {
      const map = new Map(next.map((i) => [i.id, i]));
      return Array.from(map.values());
    });
  }, []);

  return {
    items,
    hasLoaded,
    addItem,
    removeItem,
    toggleItem,
    clearAll,
    replaceAll,
  };
}
