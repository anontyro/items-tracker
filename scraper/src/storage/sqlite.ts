import Database, { Database as BetterSqliteDatabase } from "better-sqlite3";

import { ScrapedProduct } from "../scraper/boardGameScraper";

let dbInstance: BetterSqliteDatabase | null = null;
let dbPathInUse: string | null = null;

function getDb(dbPath: string): BetterSqliteDatabase {
  if (!dbInstance || dbPathInUse !== dbPath) {
    dbInstance = new Database(dbPath);
    dbPathInUse = dbPath;
    initSchema(dbInstance);
  }

  return dbInstance;
}

function initSchema(db: BetterSqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scraped_products_raw (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      source_product_id TEXT,
      name TEXT,
      url TEXT,
      price REAL,
      price_text TEXT,
      rrp REAL,
      rrp_text TEXT,
      availability_text TEXT,
      sku TEXT,
      raw_json TEXT NOT NULL,
      scraped_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scraped_products_site_time
      ON scraped_products_raw (site_id, scraped_at);

    CREATE TABLE IF NOT EXISTS price_history_sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      last_error TEXT,
      target_env TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_sync_queue_status_next
      ON price_history_sync_queue (status, next_attempt_at);

    CREATE INDEX IF NOT EXISTS idx_price_history_sync_queue_run
      ON price_history_sync_queue (run_id);

    CREATE TABLE IF NOT EXISTS scrape_progress (
      run_id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_completed_page INTEGER NOT NULL DEFAULT 0,
      pages_visited INTEGER NOT NULL DEFAULT 0,
      products_scraped INTEGER NOT NULL DEFAULT 0,
      total_pages_estimate INTEGER,
      total_products_estimate INTEGER,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scrape_progress_site_active
      ON scrape_progress (site_id, completed_at);
  `);
}

export interface RawScrapedProductRow {
  id: number;
  site_id: string;
  source_product_id: string | null;
  name: string | null;
  url: string | null;
  price: number | null;
  price_text: string | null;
  rrp: number | null;
  rrp_text: string | null;
  availability_text: string | null;
  sku: string | null;
  raw_json: string;
  scraped_at: string;
}

export type QueueStatus = "pending" | "sending" | "sent" | "failed";

export interface PriceHistorySyncQueueRow {
  id: number;
  run_id: string;
  site_id: string;
  payload_json: string;
  status: QueueStatus;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  target_env: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewPriceHistorySyncQueueItem {
  runId: string;
  siteId: string;
  payloadJson: string;
  targetEnv?: string | null;
}

export function saveScrapedProducts(
  dbPath: string,
  products: ScrapedProduct[],
  scrapedAtOverride?: string
): void {
  if (!products.length) {
    return;
  }

  const db = getDb(dbPath);
  const scrapedAt = scrapedAtOverride ?? new Date().toISOString();

  const insert = db.prepare<{
    site_id: string;
    source_product_id: string | null;
    name: string;
    url: string;
    price: number | null;
    price_text: string | null;
    rrp: number | null;
    rrp_text: string | null;
    availability_text: string | null;
    sku: string | null;
    raw_json: string;
    scraped_at: string;
  }>(
    `INSERT INTO scraped_products_raw (
      site_id,
      source_product_id,
      name,
      url,
      price,
      price_text,
      rrp,
      rrp_text,
      availability_text,
      sku,
      raw_json,
      scraped_at
    ) VALUES (
      @site_id,
      @source_product_id,
      @name,
      @url,
      @price,
      @price_text,
      @rrp,
      @rrp_text,
      @availability_text,
      @sku,
      @raw_json,
      @scraped_at
    )`
  );

  const rows = products.map((p) => ({
    site_id: p.siteId,
    source_product_id: p.sourceProductId,
    name: p.name,
    url: p.url,
    price: p.price,
    price_text: p.priceText,
    rrp: p.rrp,
    rrp_text: p.rrpText,
    availability_text: p.availabilityText,
    sku: p.sku,
    raw_json: JSON.stringify(p),
    scraped_at: scrapedAt,
  }));

  const insertMany = db.transaction((batch: typeof rows) => {
    for (const row of batch) {
      insert.run(row);
    }
  });

  insertMany(rows);
}

export function getLatestScrapedProductsForSite(
  dbPath: string,
  siteId: string
): RawScrapedProductRow[] {
  const db = getDb(dbPath);

  const latest = db
    .prepare<{ site_id: string }, { scraped_at: string | null }>(
      `SELECT MAX(scraped_at) AS scraped_at
       FROM scraped_products_raw
       WHERE site_id = @site_id`
    )
    .get({ site_id: siteId });

  if (!latest || !latest.scraped_at) {
    return [];
  }

  const rows = db
    .prepare<{ site_id: string; scraped_at: string }, RawScrapedProductRow>(
      `SELECT
         id,
         site_id,
         source_product_id,
         name,
         url,
         price,
         price_text,
         rrp,
         rrp_text,
         availability_text,
         sku,
         raw_json,
         scraped_at
       FROM scraped_products_raw
       WHERE site_id = @site_id AND scraped_at = @scraped_at
       ORDER BY id ASC`
    )
    .all({ site_id: siteId, scraped_at: latest.scraped_at });

  return rows;
}

export function enqueuePriceHistoryBatch(
  dbPath: string,
  item: NewPriceHistorySyncQueueItem
): number {
  const db = getDb(dbPath);
  const nowIso = new Date().toISOString();

  const insert = db.prepare<{
    run_id: string;
    site_id: string;
    payload_json: string;
    status: string;
    attempts: number;
    next_attempt_at: string;
    last_error: string | null;
    target_env: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `INSERT INTO price_history_sync_queue (
      run_id,
      site_id,
      payload_json,
      status,
      attempts,
      next_attempt_at,
      last_error,
      target_env,
      created_at,
      updated_at
    ) VALUES (
      @run_id,
      @site_id,
      @payload_json,
      @status,
      @attempts,
      @next_attempt_at,
      @last_error,
      @target_env,
      @created_at,
      @updated_at
    )`
  );

  const result = insert.run({
    run_id: item.runId,
    site_id: item.siteId,
    payload_json: item.payloadJson,
    status: "pending",
    attempts: 0,
    next_attempt_at: nowIso,
    last_error: null,
    target_env: item.targetEnv ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  });

  return Number(result.lastInsertRowid);
}

export interface FetchPendingQueueOptions {
  nowIso: string;
  limit: number;
  runId?: string;
}

export function fetchPendingQueueItems(
  dbPath: string,
  options: FetchPendingQueueOptions
): PriceHistorySyncQueueRow[] {
  const db = getDb(dbPath);
  const { nowIso, limit, runId } = options;

  if (limit <= 0) {
    return [];
  }

  let sql = `
    SELECT
      id,
      run_id,
      site_id,
      payload_json,
      status,
      attempts,
      next_attempt_at,
      last_error,
      target_env,
      created_at,
      updated_at
    FROM price_history_sync_queue
    WHERE status IN ('pending', 'failed')
      AND next_attempt_at <= @nowIso
  `;

  if (runId) {
    sql += " AND run_id = @runId";
  }

  sql += " ORDER BY id ASC LIMIT @limit";

  const stmt = db.prepare<
    { nowIso: string; limit: number; runId?: string },
    PriceHistorySyncQueueRow
  >(sql);

  return stmt.all({ nowIso, limit, runId });
}

export function markQueueItemSending(dbPath: string, id: number): void {
  const db = getDb(dbPath);
  const nowIso = new Date().toISOString();

  const stmt = db.prepare<{ id: number; updated_at: string }>(
    `UPDATE price_history_sync_queue
     SET status = 'sending',
         updated_at = @updated_at
     WHERE id = @id`
  );

  stmt.run({ id, updated_at: nowIso });
}

export function markQueueItemSent(dbPath: string, id: number): void {
  const db = getDb(dbPath);
  const nowIso = new Date().toISOString();

  const stmt = db.prepare<{ id: number; updated_at: string }>(
    `UPDATE price_history_sync_queue
     SET status = 'sent',
         updated_at = @updated_at
     WHERE id = @id`
  );

  stmt.run({ id, updated_at: nowIso });
}

export function markQueueItemFailed(
  dbPath: string,
  id: number,
  errorMessage: string,
  nextAttemptAtIso: string
): void {
  const db = getDb(dbPath);
  const nowIso = new Date().toISOString();

  const stmt = db.prepare<{
    id: number;
    updated_at: string;
    next_attempt_at: string;
    last_error: string;
  }>(
    `UPDATE price_history_sync_queue
     SET status = 'failed',
         attempts = attempts + 1,
         next_attempt_at = @next_attempt_at,
         last_error = @last_error,
         updated_at = @updated_at
     WHERE id = @id`
  );

  stmt.run({
    id,
    updated_at: nowIso,
    next_attempt_at: nextAttemptAtIso,
    last_error: errorMessage,
  });
}

// --- scraped_products_raw pruning -------------------------------------------
//
// `scraped_products_raw` is a pure audit/debug log (nothing reads it back at
// runtime — per-page normalization works from in-memory data), so it's safe
// to prune without affecting scraping, pushing, or resume correctness (which
// all live elsewhere: the outbox and scrape_progress).
//
// Two complementary mechanisms:
//  1. Time-based retention (primary): drop rows older than `retentionDays`.
//  2. Size-based safety valve: if the table's *logical* content (estimated
//     from row text lengths, not the on-disk file size) still exceeds
//     `maxBytes` after (1), delete the oldest remaining rows until back
//     under the cap. Logical content is used rather than the physical file
//     size because SQLite does not shrink a database file on DELETE without
//     an explicit VACUUM (freed pages are reused for future writes instead,
//     which is fine for bounding future growth, but makes on-disk file size
//     an unreliable signal for "how much more do I need to delete right
//     now" — checking it would either under- or wildly over-delete depending
//     on whether a VACUUM has ever run).

export interface PruneRawResult {
  deletedByAge: number;
  deletedBySize: number;
}

export function pruneScrapedProductsRaw(
  dbPath: string,
  options: { retentionDays: number; maxBytes: number }
): PruneRawResult {
  const db = getDb(dbPath);
  const { retentionDays, maxBytes } = options;

  let deletedByAge = 0;
  let deletedBySize = 0;

  if (retentionDays > 0) {
    const cutoffIso = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const result = db
      .prepare<{ cutoff: string }>(
        `DELETE FROM scraped_products_raw WHERE scraped_at < @cutoff`
      )
      .run({ cutoff: cutoffIso });

    deletedByAge = result.changes;
  }

  if (maxBytes > 0) {
    const summary = db
      .prepare<[], { cnt: number; approx_bytes: number }>(
        `SELECT
           COUNT(*) AS cnt,
           COALESCE(SUM(
             LENGTH(raw_json) + LENGTH(COALESCE(name, '')) +
             LENGTH(COALESCE(url, '')) + 96
           ), 0) AS approx_bytes
         FROM scraped_products_raw`
      )
      .get();

    const cnt = summary?.cnt ?? 0;
    const approxBytes = summary?.approx_bytes ?? 0;

    if (cnt > 0 && approxBytes > maxBytes) {
      const avgRowBytes = approxBytes / cnt;
      const excessBytes = approxBytes - maxBytes;
      let remaining = Math.min(cnt, Math.ceil(excessBytes / avgRowBytes));

      const BATCH_SIZE = 5000;
      const deleteOldestBatch = db.prepare<{ limit: number }>(
        `DELETE FROM scraped_products_raw
         WHERE id IN (
           SELECT id FROM scraped_products_raw
           ORDER BY scraped_at ASC
           LIMIT @limit
         )`
      );

      while (remaining > 0) {
        const batchLimit = Math.min(BATCH_SIZE, remaining);
        const result = deleteOldestBatch.run({ limit: batchLimit });
        if (result.changes === 0) {
          break;
        }
        deletedBySize += result.changes;
        remaining -= result.changes;
      }
    }
  }

  return { deletedByAge, deletedBySize };
}

// --- scrape_progress: resumability bookkeeping -----------------------------
//
// Two states only, tracked by a single nullable column: "active"
// (completed_at IS NULL) or "done". No separate "failed" status — if a
// process crashes mid-run, the row is simply left active, which *is* the
// resume signal for the next invocation. Concurrent runs for the same site
// (not possible today — single sequential scrape loop, no scheduler
// actually wired up) could double-resume the same row; not guarded against.

export interface ScrapeProgressRow {
  run_id: string;
  site_id: string;
  started_at: string;
  updated_at: string;
  last_completed_page: number;
  pages_visited: number;
  products_scraped: number;
  total_pages_estimate: number | null;
  total_products_estimate: number | null;
  completed_at: string | null;
}

// Finds the most recently updated active (incomplete) run for this site,
// as long as it was touched within `staleWindowMs` — an ancient abandoned
// row is simply ignored (left behind, not cleaned up) rather than resumed,
// since resuming a paginated scrape across too large a time gap on a
// live-changing catalog risks position drift.
export function findResumableProgress(
  dbPath: string,
  siteId: string,
  staleWindowMs: number
): ScrapeProgressRow | null {
  const db = getDb(dbPath);
  const staleCutoffIso = new Date(Date.now() - staleWindowMs).toISOString();

  const row = db
    .prepare<
      { site_id: string; stale_cutoff: string },
      ScrapeProgressRow
    >(
      `SELECT * FROM scrape_progress
       WHERE site_id = @site_id
         AND completed_at IS NULL
         AND updated_at >= @stale_cutoff
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get({ site_id: siteId, stale_cutoff: staleCutoffIso });

  return row ?? null;
}

export function createScrapeProgress(
  dbPath: string,
  args: { runId: string; siteId: string; startedAtIso: string }
): void {
  const db = getDb(dbPath);
  const nowIso = new Date().toISOString();

  const stmt = db.prepare<{
    run_id: string;
    site_id: string;
    started_at: string;
    updated_at: string;
  }>(
    `INSERT INTO scrape_progress (
      run_id, site_id, started_at, updated_at,
      last_completed_page, pages_visited, products_scraped
    ) VALUES (
      @run_id, @site_id, @started_at, @updated_at, 0, 0, 0
    )`
  );

  stmt.run({
    run_id: args.runId,
    site_id: args.siteId,
    started_at: args.startedAtIso,
    updated_at: nowIso,
  });
}

export interface UpdateScrapeProgressArgs {
  lastCompletedPage: number;
  pagesVisitedDelta: number;
  productsScrapedDelta: number;
  totalPagesEstimate?: number | null;
  totalProductsEstimate?: number | null;
}

// Called after each page is durably captured (raw insert + outbox enqueue
// both succeeded locally), regardless of whether the immediate backend push
// attempt itself succeeded — a push failure is retried independently via
// the outbox, it doesn't mean the page needs to be re-scraped.
export function updateScrapeProgress(
  dbPath: string,
  runId: string,
  args: UpdateScrapeProgressArgs
): void {
  const db = getDb(dbPath);
  const nowIso = new Date().toISOString();

  const stmt = db.prepare<{
    run_id: string;
    updated_at: string;
    last_completed_page: number;
    pages_visited_delta: number;
    products_scraped_delta: number;
    total_pages_estimate: number | null;
    total_products_estimate: number | null;
  }>(
    `UPDATE scrape_progress
     SET updated_at = @updated_at,
         last_completed_page = @last_completed_page,
         pages_visited = pages_visited + @pages_visited_delta,
         products_scraped = products_scraped + @products_scraped_delta,
         total_pages_estimate = COALESCE(@total_pages_estimate, total_pages_estimate),
         total_products_estimate = COALESCE(@total_products_estimate, total_products_estimate)
     WHERE run_id = @run_id`
  );

  stmt.run({
    run_id: runId,
    updated_at: nowIso,
    last_completed_page: args.lastCompletedPage,
    pages_visited_delta: args.pagesVisitedDelta,
    products_scraped_delta: args.productsScrapedDelta,
    total_pages_estimate: args.totalPagesEstimate ?? null,
    total_products_estimate: args.totalProductsEstimate ?? null,
  });
}

export function completeScrapeProgress(dbPath: string, runId: string): void {
  const db = getDb(dbPath);
  const nowIso = new Date().toISOString();

  const stmt = db.prepare<{ run_id: string; completed_at: string }>(
    `UPDATE scrape_progress
     SET completed_at = @completed_at,
         updated_at = @completed_at
     WHERE run_id = @run_id`
  );

  stmt.run({ run_id: runId, completed_at: nowIso });
}
