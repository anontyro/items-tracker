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
