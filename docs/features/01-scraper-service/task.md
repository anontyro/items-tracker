# Board Game Price Tracker – Scraper Service (MVP)

## Implementation Plan

- [x] 1. Establish scraper service foundation

  - Create a dedicated `scraper` Node.js/TypeScript project (separate package or service) using Playwright.
  - Configure TypeScript, ESLint/Prettier, basic folder structure (`src/config`, `src/scraper`, `src/jobs`).
  - Add core dependencies: `playwright`, `axios`, `dotenv` (if needed), `pino` or similar logger.
  - Define env loading for `SCRAPE_SCHEDULE`, `RATE_LIMIT_DELAY`, `MAX_RETRIES`, `RETRY_DELAY`, `BACKEND_API_URL`, `API_KEY`.
  - _PRD refs: 3.1.1, 3.1.2, 4.1 Scraper Service_
  - Status: Implemented (scraper service foundation exists)

- [x] 2. Define site configuration format and loader

  - Create a JSON schema/type for site config matching PRD (siteId, siteName, baseUrl, listPageUrl, selectors, paginationSelector, rateLimitMs, isActive).
  - Implement a config loader that reads site configs from a known directory (e.g. `config/sites/*.json`).
  - Validate site configs on startup (required fields present, selectors non-empty, `rateLimitMs` positive).
  - Implement a simple in-memory registry of active sites (filter `isActive === true`).
  - _PRD refs: 3.1.3, 3.1.4 (step 1)_
  - Status: Implemented (site config types and loader in place)

- [x] 3. Implement core scraping flow with Playwright

  - Implement a `ScrapeRunner` that, for a given site config:
    - Launches Playwright browser (headless) and opens the configured list page.
    - Locates product list elements using `selectors.productList`.
    - Extracts product fields per item:
      - Required: name, price, availability, source URL.
      - Optional: RRP, SKU, additional unstructured data.
  - Add pagination support using `paginationSelector` (follow “next page” until exhausted).
  - Enforce rate limiting between requests using `rateLimitMs` / `RATE_LIMIT_DELAY`.
  - Normalize scraped data into a typed DTO that matches the backend bulk upload format.
  - _PRD refs: 3.1.4 (steps 2–7), 4.1 Scraper Service_
  - Status: Implemented for initial site (further refinements possible)

- [ ] 4. Implement retry and error handling

  - Implement per-site and per-request retry logic (up to `MAX_RETRIES` with `RETRY_DELAY`).
  - On individual item failure, log and continue processing remaining items.
  - On page-level or site-level failure, capture error details and mark scrape as failed.
  - Ensure critical errors are surfaced via structured logs for future monitoring.
  - _PRD refs: 3.1.4 (step 6), 3.1.5, 8.3 Reliability_
  - Status: Not started

- [x] 5. Integrate with backend bulk upload API

  - Define a `BulkUploadRequest` TypeScript type matching the ingest endpoint body.
  - Implement an HTTP client wrapper (e.g. using `axios`) configured with `BACKEND_API_URL` and `API_KEY` (Authorization header).
  - Implement a function that:
    - Accepts normalized product data and metadata (scrapeTimestamp, siteId).
    - Sends a bulk upload request and handles success + error responses.
  - Log counts of created/updated products and any errors returned by the backend.
  - _PRD refs: 3.1.1 (submit bulk data), 3.1.4 (step 8), 3.2.2 Bulk Upload API, 4.1 Scraper Service_
  - Status: Implemented (via `/v1/price-history/batch` ingest endpoint)

- [ ] 6. Job scheduling and queue integration (BullMQ)

  - Configure a Redis-backed BullMQ queue for scrape jobs (e.g. `scrapeQueue`).
  - Implement a job producer that:
    - Schedules recurring jobs based on `SCRAPE_SCHEDULE` (cron expression).
    - Supports manual, ad-hoc job creation (for specific `siteId` or all sites).
  - Implement a job processor that:
    - Takes a job payload (`siteId`, optional overrides) and runs the scraping flow.
    - Updates progress and final status (queued → processing → completed/failed).
  - Ensure idempotency where possible (e.g. avoid duplicate concurrent scrapes for same site).
  - _PRD refs: 3.1.1, 3.1.2, 3.2.2 Scraper Management API, 4.1 Scraper Service_
  - Status: Not started

- [ ] 7. Manual trigger integration with backend

  - Implement an internal HTTP endpoint in the scraper service **or** rely solely on the Nest backend’s `/api/v1/scraper/trigger` to enqueue jobs (depending on final architecture).
  - Ensure that when the backend calls into the scraper (directly or via queue), a job is created with a trackable `jobId`.
  - Document the contract between backend and scraper for job triggering.
  - _PRD refs: 3.1.1 (Trigger: Manual endpoint), 3.2.2 Scraper Management API, 4.1 Scraper Service_
  - Status: Not started

- [ ] 8. Logging, observability, and scrape metadata

  - Define a standard log format (JSON) including siteId, jobId, scrapeTimestamp, product counts, and error summaries.
  - Ensure key events are logged: job started, page scraped, job completed, job failed.
  - Include timing information (responseTimeMs where available) to support future performance analysis.
  - Align log fields with backend `ScrapeLog` expectations where appropriate.
  - _PRD refs: 3.1.1 (log operations), 3.1.5, 3.3.1 ScrapeLog, 7.1 Data Flow_
  - Status: Not started

- [ ] 9. Local development and testing for scraper

  - Add scripts for local runs (e.g. `npm run scrape:once`, `npm run scrape:dev`).
  - Mock backend API in tests and verify bulk upload payload structure.
  - Add unit tests for:
    - Config loader and validation.
    - HTML extraction and normalization logic.
    - Retry behavior and error handling.
  - Add a short README section describing how to run the scraper locally within Docker Compose.
  - _PRD refs: 5.1–5.2 Testing, 6.1–6.3 Local Dev & Docker Compose_
  - Status: Not started
