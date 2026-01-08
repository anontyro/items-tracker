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
  products: ScrapedProduct[]
): void {
  if (!products.length) {
    return;
  }

  const db = getDb(dbPath);
  const scrapedAt = new Date().toISOString();

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
