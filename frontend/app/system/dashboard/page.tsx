"use client";

import { useEffect, useState } from "react";

import { useAdminApiKey } from "../../../lib/hooks/useAdminApiKey";

interface ScrapeRunSummary {
  finishedAt: string;
  itemCount?: number;
  errorMessage?: string | null;
  status?: string;
  runId?: string | null;
}

interface ScrapeSiteStatus {
  siteId: string;
  lastRun?: {
    status: string;
    finishedAt: string;
    itemCount: number;
    runId: string | null;
  };
  lastSuccess?: {
    finishedAt: string;
    itemCount: number;
    runId: string | null;
  };
  lastFailure?: {
    finishedAt: string;
    errorMessage: string | null;
    runId: string | null;
  };
}

export default function SystemDashboardPage() {
  const { adminKey, setAdminKey, clearAdminKey } = useAdminApiKey();
  const [statuses, setStatuses] = useState<ScrapeSiteStatus[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    if (!adminKey) {
      setError("Enter admin API key to load status");
      setStatuses(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/scrape-status", {
        headers: {
          "x-admin-api-key": adminKey,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized: admin API key is invalid");
          clearAdminKey();
        } else {
          setError(`Failed to load status (HTTP ${res.status})`);
        }
        setStatuses(null);
        return;
      }

      const data = (await res.json()) as ScrapeSiteStatus[];
      setStatuses(data);
    } catch (err) {
      setError("Failed to load status");
      setStatuses(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (adminKey) {
      // Auto-load when we have a key (e.g. from localStorage)
      loadStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  function renderRunSummary(label: string, run?: ScrapeRunSummary) {
    if (!run) return <span>-</span>;

    const date = new Date(run.finishedAt);
    const dateText = isNaN(date.getTime())
      ? run.finishedAt
      : date.toLocaleString();

    return (
      <div>
        <div>
          {label}: {dateText}
        </div>
        {typeof run.itemCount === "number" && <div>Items: {run.itemCount}</div>}
        {run.errorMessage && <div>Error: {run.errorMessage}</div>}
      </div>
    );
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        System Dashboard – Scrape Status
      </h1>

      <section
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label>
          <span style={{ marginRight: "0.5rem" }}>Admin API key:</span>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            style={{ minWidth: "260px" }}
          />
        </label>
        <button
          type="button"
          onClick={loadStatus}
          disabled={loading}
          style={{ padding: "0.25rem 0.75rem" }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </section>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}

      {!statuses && !error && !loading && (
        <p>Enter your admin API key and click Refresh to view scrape status.</p>
      )}

      {statuses && statuses.length > 0 && (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "800px",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Site
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Last run
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Last success
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Last failure
              </th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((site) => (
              <tr key={site.siteId}>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  {site.siteId}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  {renderRunSummary("", site.lastRun)}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  {renderRunSummary("", site.lastSuccess)}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  {renderRunSummary("", site.lastFailure)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {statuses && statuses.length === 0 && !loading && (
        <p>No scrape runs have been recorded yet.</p>
      )}
    </main>
  );
}
