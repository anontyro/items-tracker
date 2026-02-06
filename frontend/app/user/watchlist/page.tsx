"use client";

import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import Watchlist from "../../../components/watchlist/Watchlist";

type WatchlistItem = {
  id: string;
  name: string;
};

export default function UserWatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("watchlist");
    if (!stored) {
      return;
    }

    setRawJson(stored);

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

  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.id, item])).values(),
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your watchlist from this browser? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem("watchlist");
    setItems([]);
    setRawJson("");
    setJsonError(null);
  };

  const handleSave = () => {
    setJsonError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson || "[]");
    } catch (error) {
      setJsonError("Invalid JSON: please ensure the value is valid JSON.");
      return;
    }

    if (!Array.isArray(parsed)) {
      setJsonError("The watchlist JSON must be an array of IDs or objects.");
      return;
    }

    const nextItems: WatchlistItem[] = [];

    for (const value of parsed) {
      if (typeof value === "string") {
        nextItems.push({ id: value, name: value });
      } else if (
        value &&
        typeof value === "object" &&
        typeof (value as any).id === "string"
      ) {
        const id = (value as any).id as string;
        const nameRaw = (value as any).name;
        const name =
          typeof nameRaw === "string" && nameRaw.trim()
            ? (nameRaw as string)
            : id;
        nextItems.push({ id, name });
      } else {
        setJsonError(
          "Each item must be either a string ID or an object with at least an 'id' property.",
        );
        return;
      }
    }

    const unique = Array.from(
      new Map(nextItems.map((item) => [item.id, item])).values(),
    );

    window.localStorage.setItem(
      "watchlist",
      JSON.stringify(
        unique.map((item) => ({
          id: item.id,
          name: item.name,
        })),
      ),
    );

    setItems(unique);
    setRawJson(
      JSON.stringify(
        unique.map((item) => ({
          id: item.id,
          name: item.name,
        })),
        null,
        2,
      ),
    );
  };

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

        <Stack spacing={1} sx={{ mt: 4 }}>
          <Typography variant="h6">Import / export watchlist</Typography>
          <Typography variant="body2" color="text.secondary">
            The box below shows the raw JSON stored in your browser&apos;s local
            storage under the <code>watchlist</code> key. You can edit it, copy
            it to back up your watchlist, or paste a value from another browser.
          </Typography>

          <TextField
            label="Watchlist JSON"
            multiline
            minRows={6}
            value={rawJson}
            onChange={(event) => {
              setRawJson(event.target.value);
              setJsonError(null);
            }}
            fullWidth
          />

          {jsonError && (
            <Typography variant="body2" color="error">
              {jsonError}
            </Typography>
          )}

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleCopy} disabled={!rawJson}>
              Copy
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              disabled={!rawJson}
            >
              Delete
            </Button>
            <Button variant="contained" color="primary" onClick={handleSave}>
              Save
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
