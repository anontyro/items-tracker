# Feature 14: Scraper Offline Sync & Outbox

This feature adds a durable **offline-safe sync mechanism** to the scraper using SQLite. Scraped price history data will always be written to the local SQLite database, and a dedicated **outbox/queue table** will track batches that still need to be sent to the backend API. A small background worker and a manual CLI script will then **drain the outbox** to one of several target environments (local, staging, production) when the API is available.

The goal is:

- No scraped data is lost if the API is down.
- Sync logic is **fully decoupled** from the scraping logic.
- Data can be synced later to **different environments** (e.g. local vs production) in a controlled way.

---

## Implementation Plan

1. [x] **Define SQLite outbox/queue table in scraper database**

   - [x] Added a new table in the scraper's SQLite schema, `price_history_sync_queue`:
     - [x] `id` (integer primary key, autoincrement).
     - [x] `run_id` (string identifier for the scrape run/batch).
     - [x] `site_id` (site identifier to aid debugging and filtering).
     - [x] `payload_json` (JSON blob containing the exact body currently sent to `/v1/price-history/batch`, i.e. `{ normalized: NormalizedPriceHistoryInput[] }`).
     - [x] `status` (text; enum values `pending`, `sending`, `sent`, `failed`).
     - [x] `attempts` (integer; number of delivery attempts so far).
     - [x] `next_attempt_at` (datetime; when this row becomes eligible for the next retry, for basic backoff).
     - [x] `last_error` (text; optional diagnostic string from the last failure).
     - [x] `target_env` (optional text; reserved for future per-row environment targeting).
     - [x] `created_at` / `updated_at` (datetimes managed by the scraper).
   - [x] Ensured there are indexes on `status` + `next_attempt_at`, and on `run_id`, to support efficient selection of pending items.
   - [x] Kept this table **strictly about API delivery**, independent from the raw scrape storage table.

2. [x] **Update scraper write path to always enqueue outbox entries**

   - [x] Identified the point in the scraper where a run completes: after scraping, saving raw products to SQLite, and normalizing rows for a site.
   - [x] For each site scrape, the scraper now:
     - [x] Saves raw products into `scraped_products_raw`.
     - [x] Loads the latest rows for the site and normalizes them to `NormalizedPriceHistoryInput[]`.
     - [x] Inserts a row into `price_history_sync_queue` with:
       - [x] `run_id` (synthetic ID derived from `siteId` + timestamp) for traceability.
       - [x] `payload_json` containing `{ normalized }` for direct replay.
       - [x] `status = 'pending'`, `attempts = 0`, `next_attempt_at = NOW()`, `last_error = NULL`.
   - [ ] Future improvement: wrap the SQLite writes and queue insert in a single transaction so that they succeed or fail together.
   - [x] The online API call is **not** part of these writes; the DB state is updated even if the backend is unreachable.

3. [x] **Implement background sync worker to drain the outbox**

   - [x] Created a worker module in the scraper project, `src/workers/priceHistorySyncWorker.ts`, responsible for:
     - [x] Periodically querying `price_history_sync_queue` for rows where:
       - [x] `status IN ('pending', 'failed')`, and
       - [x] `next_attempt_at <= NOW()`.
       - [x] Applying a batch `LIMIT` (configurable via `SYNC_WORKER_BATCH_LIMIT`).
     - [x] For each selected item:
       - [x] Marking it as `status = 'sending'` to avoid double-processing.
       - [x] Reading `payload_json` directly as the request body (`{ normalized }`).
       - [x] Determining the target API base URL and API key from configuration (see section 5 below).
       - [x] POSTing to `POST /v1/price-history/batch` with the scraper API key.
       - [x] On success:
         - [x] Setting `status = 'sent'`, updating `updated_at`.
       - [x] On failure (network, timeout, non-2xx, auth error):
         - [x] Incrementing `attempts`.
         - [x] Setting `status = 'failed'`.
         - [x] Updating `last_error` with a concise, non-sensitive error message.
         - [x] Computing and setting `next_attempt_at` using a simple exponential backoff strategy.
   - [x] Provided an entrypoint that runs this worker in a loop with sleep intervals, exposed via `pnpm sync-worker` in the scraper package.
   - [x] The worker handles errors gracefully and does not spin in a tight loop when the API is unreachable.

4. [x] **Add a manual CLI sync command for one-off or ad-hoc pushes**

   - [x] Implemented a separate CLI script, `src/tools/syncPendingRuns.ts`, that can be run **on demand** without a long-running process.
   - [x] Behavior:
     - [x] Accepts command-line options:
       - [x] `--api-url <URL>` to override the base API URL explicitly.
       - [x] `--api-key <key>` to override the scraper API key explicitly (optional; otherwise defaults from environment).
       - [x] `--run-id <id>` to force-sync a specific run only (optional).
       - [x] `--limit <n>` to cap the number of queue items processed in a single invocation (default: 50).
     - [x] Within the script:
       - [x] Resolves configuration: derives target `apiUrl` and `apiKey` from CLI overrides or environment (see section 5).
       - [x] Selects eligible `price_history_sync_queue` rows (similar filter as the worker, but with a one-off `LIMIT`).
       - [x] For each selected row, attempts to send once and updates `status`/`attempts`/`next_attempt_at`/`last_error` accordingly.
   - [x] Added npm scripts in the scraper `package.json`:
     - [x] `"sync-pending": "ts-node-dev --respawn --transpile-only src/tools/syncPendingRuns.ts"` for dev usage.
   - [x] Documented that this command is the **manual override** path for pushing data when you explicitly want to sync now (e.g. after starting the backend, or targeting a different environment).

5. [x] **Support multiple target environments (local vs production)**

   - [x] Extended scraper configuration to allow multiple API targets via environment variables:
     - [x] Default/backend URL and key come from `BACKEND_API_URL` and `API_KEY` (already used by the scraper).
     - [x] Optional overrides for sync use `SYNC_API_URL` and `SYNC_API_KEY`.
   - [x] In both the background worker and manual CLI:
     - [x] Derive the target URL/key from CLI overrides or env vars so that **the same SQLite outbox** can be drained into different environments when appropriate.
     - [x] Keep sending historical data to production an explicit action by requiring `SYNC_API_URL`/`SYNC_API_KEY` or explicit `--api-url`/`--api-key` flags.
   - [ ] A `target_env` column exists on `price_history_sync_queue` for future use, but is not yet actively used to route items.

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
