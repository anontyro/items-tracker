"use client";

import { useCallback, useEffect, useState } from "react";

const ADMIN_KEY_STORAGE_KEY = "site-items-tracker-admin-api-key";

export function useAdminApiKey() {
  const [adminKey, setAdminKeyState] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ADMIN_KEY_STORAGE_KEY);
    if (stored) {
      setAdminKeyState(stored);
    }
  }, []);

  const setAdminKey = useCallback((value: string) => {
    setAdminKeyState(value);
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(ADMIN_KEY_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
    }
  }, []);

  const clearAdminKey = useCallback(() => {
    setAdminKey("");
  }, [setAdminKey]);

  const hasAdminKey = !!adminKey;

  return { adminKey, hasAdminKey, setAdminKey, clearAdminKey };
}
