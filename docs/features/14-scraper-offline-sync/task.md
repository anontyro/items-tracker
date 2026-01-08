# Feature 14: Scraper Offline Sync & Outbox

This feature adds a durable **offline-safe sync mechanism** to the scraper using SQLite. Scraped price history data will always be written to the local SQLite database, and a dedicated **outbox/queue table** will track batches that still need to be sent to the backend API. A small background worker and a manual CLI script will then **drain the outbox** to one of several target environments (local, staging, production) when the API is available.

The goal is:

- No scraped data is lost if the API is down.
- Sync logic is **fully decoupled** from the scraping logic.
- Data can be synced later to **different environments** (e.g. local vs production) in a controlled way.

---

## Implementation Plan

1. [ ] **Define SQLite outbox/queue table in scraper database**

   - [ ] Add a new table in the scraper's SQLite schema, e.g. `price_history_sync_queue` (name can be adjusted to match existing conventions):
     - [ ] `id` (integer primary key, autoincrement).
     - [ ] `run_id` (foreign key / reference to the scraper's run or batch identifier).
     - [ ] `payload` (JSON blob containing the exact body to POST to `/v1/price-history/batch`, or enough information to reconstruct it from other tables).
     - [ ] `status` (text; enum values such as `pending`, `sending`, `sent`, `failed`).
     - [ ] `attempts` (integer; number of delivery attempts so far).
     - [ ] `next_attempt_at` (datetime; when this row becomes eligible for the next retry, for basic backoff).
     - [ ] `last_error` (text; optional diagnostic string from the last failure).
     - [ ] `created_at` / `updated_at` (datetimes managed by the scraper).
   - [ ] Ensure there is an index on `status` and `next_attempt_at` to support efficient selection of pending items.
   - [ ] Keep this table **strictly about API delivery**, so it remains independent of scraper internals apart from `run_id` (and/or payload).

2. [ ] **Update scraper write path to always enqueue outbox entries**

   - [ ] Identify the point in the scraper where a run completes and price history snapshots are currently written to SQLite.
   - [ ] Wrap the following steps in a SQLite transaction:
     - [ ] Insert/update the scraped run metadata (run table, if present).
     - [ ] Insert the individual price snapshots into their local tables.
     - [ ] Insert a row into `price_history_sync_queue` with:
       - [ ] `run_id` for traceability.
       - [ ] `payload` representing the batch body that should be sent to the backend API (`/v1/price-history/batch`). This can either:
         - [ ] Store **the full JSON body** (denormalized); or
         - [ ] Store just `run_id` and reconstruct the batch from the run and snapshot tables in the sync worker.
       - [ ] `status = 'pending'`.
       - [ ] `attempts = 0`, `next_attempt_at = NOW()`, `last_error = NULL`.
   - [ ] Commit the transaction.
   - [ ] Do **not** make the online API call part of this transaction; the DB write must succeed regardless of API state.

3. [ ] **Implement background sync worker to drain the outbox**

   - [ ] Create a small worker module/CLI in the scraper project, e.g. `src/workers/priceHistorySyncWorker.ts`, responsible for:
     - [ ] Periodically querying `price_history_sync_queue` for rows where:
       - [ ] `status IN ('pending', 'failed')`, and
       - [ ] `next_attempt_at <= NOW()`.
       - [ ] Apply a reasonable batch `LIMIT` (e.g. 50–100 rows per cycle).
     - [ ] For each selected item:
       - [ ] Mark it as `status = 'sending'` (optional but helpful to avoid concurrent workers double-sending the same row).
       - [ ] Build the request body:
         - [ ] Either read `payload` directly if fully denormalized; or
         - [ ] Reconstruct from `run_id` + associated snapshot rows.
       - [ ] Determine the target API base URL and API key from configuration (see section 5 below).
       - [ ] POST to `POST /v1/price-history/batch` with the appropriate scraper API key (`x-api-key: <SCRAPER_API_KEY>`).
       - [ ] On success:
         - [ ] Set `status = 'sent'`, increment `attempts`, update `updated_at`, and optionally set a `synced_at`-like timestamp if desired.
       - [ ] On failure (network, timeout, non-2xx, auth error):
         - [ ] Increment `attempts`.
         - [ ] Set `status = 'failed'`.
         - [ ] Update `last_error` with a concise, non-sensitive error message.
         - [ ] Compute and set `next_attempt_at` using a simple backoff strategy (e.g. `NOW() + MIN(2^attempts * baseDelay, maxDelay)`).
   - [ ] Provide an entrypoint that can run this worker in a loop with sleep intervals (e.g. every 30–60 seconds) so it can be started as a long-running process, e.g. `npm run scraper:sync-worker`.
   - [ ] Ensure the worker exits gracefully or retries politely when the API is unreachable (no tight loops).

4. [ ] **Add a manual CLI sync command for one-off or ad-hoc pushes**

   - [ ] Implement a separate CLI script, e.g. `src/tools/syncPendingRuns.ts`, that can be run **on demand** without a long-running process.
   - [ ] Behavior:
     - [ ] Accept command-line options such as:
       - [ ] `--env local|production|<other>` (logical environment selector), and/or
       - [ ] `--api-url <URL>` to override the base API URL explicitly.
       - [ ] `--api-key <key>` to override the scraper API key explicitly (optional; can default from environment).
       - [ ] `--run-id <id>` to force-sync a specific run only (optional).
       - [ ] `--limit <n>` to cap the number of queue items processed in a single invocation.
     - [ ] Within the script:
       - [ ] Resolve configuration: derive target `apiUrl` and `apiKey` based on `--env` (see section 5) and/or overrides.
       - [ ] Select eligible `price_history_sync_queue` rows (similar filter as the worker, but usually with a fixed `LIMIT`).
       - [ ] For each selected row, attempt to send once and update status/attempts/next_attempt_at/last_error accordingly.
   - [ ] Add npm/yarn scripts in the scraper `package.json`, e.g.:
     - [ ] `"scraper:sync-pending": "ts-node src/tools/syncPendingRuns.ts"` (or compiled equivalent).
   - [ ] Document that this command is the **manual override** path for pushing data when you explicitly want to sync now (e.g. after starting the backend, or targeting a different environment).

5. [ ] **Support multiple target environments (local vs production)**

   - [ ] Extend scraper configuration to describe **one or more API targets**, for example:
     - [ ] `SCRAPER_API_URL_LOCAL`
     - [ ] `SCRAPER_API_URL_PRODUCTION`
     - [ ] `SCRAPER_API_KEY_LOCAL`
     - [ ] `SCRAPER_API_KEY_PRODUCTION`
   - [ ] Alternatively, keep a single `SCRAPER_API_URL` and `SCRAPER_API_KEY` for default behavior, and allow the manual CLI to override them with command-line flags.
   - [ ] In both the background worker and manual CLI:
     - [ ] Derive the target URL/key from an `env` option or direct overrides, so that **the same SQLite outbox** can be drained into different environments when appropriate.
     - [ ] Be explicit that sending historical data to production from a local DB is **intentional** and should be guarded by command-line arguments (not by default behavior).
   - [ ] Consider adding a `target_env` column to `price_history_sync_queue` only if you foresee needing to track which environment a particular row was meant for. Otherwise, the worker/CLI can decide at send time.

6. [ ] **Idempotency and duplicate handling**

   - [ ] Ensure the payload sent to `POST /v1/price-history/batch` includes a stable identifier for the run/batch (e.g. `runId` or a UUID) so the backend can safely deduplicate.
   - [ ] On the backend side (out of scope for this feature doc, but recommended):
     - [ ] Implement idempotent behavior on the ingest endpoint, e.g. by:
       - [ ] Using a unique constraint on a suitable combination of fields (e.g. `(runId, productId, sourceId, scrapedAt)`), or
       - [ ] Explicit upsert semantics in the `PriceHistoryService`.
   - [ ] This allows the worker and CLI to **retry safely** without risking double-counting when an earlier attempt may have partially succeeded.

7. [ ] **Testing & verification**

   - [ ] Unit-level tests:
     - [ ] For the outbox insertion logic (run completion path) to confirm that each run enqueues an appropriate `price_history_sync_queue` row.
     - [ ] For the sync worker/CLI logic to confirm correct state transitions (`pending` → `sending` → `sent` / `failed`), attempt counting, and backoff calculation.
   - [ ] Integration/manual tests:
     - [ ] Start scraper with the backend **stopped**, run a small scrape, and verify:
       - [ ] Data is present in the main SQLite tables.
       - [ ] A `pending` row exists in `price_history_sync_queue`.
     - [ ] Start the backend (local environment), then run the manual CLI once:
       - [ ] Confirm the CLI sends the batch to `/v1/price-history/batch` with the correct API key.
       - [ ] Confirm the queue row becomes `sent` (and/or `synced_at` set).
       - [ ] Confirm the backend DB shows the new price history data.
     - [ ] Repeat the above for a **production-targeted** run, using the `--env production` or explicit `--api-url/--api-key` flags, to validate cross-environment sync.
   - [ ] Add basic logging around worker and CLI runs (start/end, number of items processed, number of successful sends, number of failures) for observability.

---

## Dependencies / Notes

- This feature is scoped to the **scraper and its SQLite database**. It should not require changes to the core scraping logic beyond the point where run results are persisted and the outbox row is inserted.
- The feature depends on the existing backend endpoint `POST /v1/price-history/batch` and the `SCRAPER_API_KEY` auth mechanism already in place.
- The background worker and manual CLI should share as much implementation logic as possible (e.g. a shared `syncQueueBatch()` function) to avoid divergence.
- By keeping the outbox in SQLite and the target API configurable, this feature provides a robust way to:
  - Capture all scraped data even when the backend is offline.
  - Replay historical data into different backend environments as needed.

---

## Practical usage (current implementation)

The following notes describe how the initial implementation of this feature works in the scraper codebase.

### Queue table & main enqueue path

- The SQLite schema defines `price_history_sync_queue` with columns:
  - `run_id`, `site_id`, `payload_json`, `status`, `attempts`, `next_attempt_at`, `last_error`, `target_env`, `created_at`, `updated_at`.
- After each scrape run for a site, the scraper:
  - Normalizes rows to `NormalizedPriceHistoryInput[]`.
  - Enqueues a row into `price_history_sync_queue` with `payload_json = JSON.stringify({ normalized })` and `status = 'pending'`.
  - Attempts an immediate online send to `/v1/price-history/batch`.
    - On success: marks the queue row `sent`.
    - On failure: marks the row `failed` and sets `next_attempt_at` using exponential backoff.

### Background worker

- Worker entrypoint: `src/workers/priceHistorySyncWorker.ts`.
- Dev script (from `scraper` package root):
  - `pnpm sync-worker`
- Behaviour:
  - Periodically fetches queue rows where `status IN ('pending', 'failed')` and `next_attempt_at <= now`.
  - For each row:
    - Marks status `sending`.
    - Parses `payload_json` and calls the same backend ingest endpoint.
    - On success: marks `sent`.
    - On failure: increments `attempts`, updates `last_error`, and pushes `next_attempt_at` into the future.
- Key environment variables:
  - `SYNC_WORKER_INTERVAL_MS` – interval between polling loops (default: `60000`).
  - `SYNC_WORKER_BATCH_LIMIT` – max queue rows to process per loop (default: `50`).

### Manual sync CLI

- CLI entrypoint: `src/tools/syncPendingRuns.ts`.
- Dev script (from `scraper` package root):
  - `pnpm sync-pending -- [options]`
- Supported options:
  - `--limit <n>` – max queue items to process in this run (default: `50`).
  - `--run-id <id>` – restrict processing to a single `run_id` (optional).
  - `--api-url <URL>` – override target API base URL.
  - `--api-key <KEY>` – override API key.
- Example usages:

  - Sync up to 100 pending/failed items to the default (local) backend:

    ```bash
    pnpm sync-pending -- --limit 100
    ```

  - Force-sync a specific run to production:

    ```bash
    pnpm sync-pending -- \
      --run-id my-site-2025-01-01T12:00:00.000Z \
      --api-url https://prod-api.example.com \
      --api-key $SCRAPER_API_KEY_PRODUCTION
    ```

### Environment targeting

- Both the worker and CLI resolve the target API as follows:
  - `apiBaseUrl`:
    - `SYNC_API_URL` → `BACKEND_API_URL` → `config.backendApiUrl`.
  - `apiKey`:
    - `SYNC_API_KEY` → `API_KEY` → `config.apiKey`.
- Recommended environment variables for clarity:
  - `BACKEND_API_URL` / `API_KEY` – default (typically local) backend and key.
  - `SYNC_API_URL` / `SYNC_API_KEY` – optional overrides for one-off syncs (e.g. production).

This means the same SQLite outbox can be drained into **local or production** simply by adjusting environment variables or CLI flags when running the worker or manual sync script.
