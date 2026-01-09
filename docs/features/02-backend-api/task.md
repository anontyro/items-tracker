# Board Game Price Tracker – Backend API (NestJS, Prisma) – MVP

## Implementation Plan

- [x] 1. Backend project setup and core configuration

  - Create a NestJS backend service (if not already present) structured with modules: `Products`, `PriceHistory`, `Tracking`, `Scraper`, and shared/common modules.
  - Configure TypeScript, ESLint/Prettier, and Nest configuration for environment-based settings (dev vs prod).
  - Integrate Prisma with the Nest app (PrismaModule, PrismaService, proper lifecycle hooks).
  - Configure environment variables for database (SQLite in dev, Postgres in prod), Redis, API port, and API versioning.
  - _PRD refs: 3.2.1, 3.2.3, 3.3, 6.1–6.3_
  - Status: Implemented (NestJS app with Prisma and core modules is in place)

- [x] 2. Implement Prisma schema and migrations

  - Translate the PRD’s schema into `schema.prisma` (Product, ProductSource, PriceHistory, ProductTracking, Wishlist, WishlistItem, ScrapeLog).
  - Ensure appropriate indexes and unique constraints are in place as per PRD.
  - Configure Prisma for:
    - SQLite in development (`file:./dev.db`).
    - PostgreSQL in production (`postgresql://…`).
  - Run initial migrations and verify connections for both dev and Docker Compose environments.
  - _PRD refs: 3.3.1–3.3.2, 4.1 Backend API, 6.1–6.3_
  - Status: In progress (core models implemented; Wishlist & ScrapeLog still to add/migrate)

- [x] 3. Products module and CRUD/read endpoints

  - Implement `ProductsModule` with service + controller.
  - Implement `GET /api/v1/products` with support for:
    - Search by name (`search`).
    - Filtering by price range (`minPrice`, `maxPrice`).
    - Filtering by availability.
    - Sorting (`sortBy`, `sortOrder`) and pagination (`page`, `limit`).
    - Returning products with a 7-day price summary for list views.
  - Implement `GET /api/v1/products/:id` for full product details and basic history summary.
  - Ensure response shapes match PRD expectations.
  - _PRD refs: 3.2.2 Products API, 3.3, 4.1 Backend API_
  - Status: Implemented (search, detail, and history endpoints exist; advanced filters/summaries still to add)

- [x] 4. Price history module and history endpoints

  - Implement `PriceHistoryModule` with service + controller (or integrate into `ProductsModule` where appropriate).
  - Implement `GET /api/v1/products/:id/history` with `range` query param (7d, 30d, 90d, all).
  - Ensure queries efficiently use Prisma and indexes (`productId`, `scrapedAt`).
  - Implement mapping from raw history rows to chart-friendly DTOs (sorted by date, include availability and RRP).
  - _PRD refs: 3.2.2 Products API (history), 3.3.1 PriceHistory, 4.1 Backend API_
  - Status: Partially implemented (history endpoint provided via ProductsController; ingest handled by PriceHistoryModule)

- [x] 5. Bulk upload endpoint for scraper integration

  - Implement `ScraperModule` with controller + service.
  - Implement `POST /api/v1/scraper/bulk-upload`:
    - Validate Authorization via `SCRAPER_API_KEY` (Bearer token).
    - Validate request body (siteId, scrapeTimestamp, products array) against DTO.
    - Upsert `Product` and `ProductSource` records as needed.
    - Insert `PriceHistory` rows for each product instance.
  - Return aggregate stats: `created`, `updated`, `errors`.
  - Ensure proper transaction boundaries (group operations per request as needed).
  - _PRD refs: 3.2.2 Bulk Upload API, 3.3.1, 4.1 Backend API, 8.4 Security_
  - Status: Implemented (via `POST /v1/price-history/batch` with `SCRAPER_API_KEY` auth)

- [ ] 6. Tracking module and endpoints (MVP scope)

  - Implement `TrackingModule` with service + controller.
  - Implement endpoints:
    - `GET /api/v1/tracking` – list tracked items with product details.
    - `POST /api/v1/tracking` – create a new tracking record for a product with basic `general` track type (MVP).
    - `DELETE /api/v1/tracking/:productId` – remove tracking for a product.
  - Align data model with `ProductTracking` schema (userId may be null for MVP).
  - Ensure endpoints are designed so that future advanced conditions can be added without breaking changes.
  - _PRD refs: 3.2.2 Tracking API, 3.3.1 ProductTracking, 4.1 Backend API_
  - Status: Not started

- [ ] 7. Scraper management endpoints and BullMQ integration

  - Integrate BullMQ in the backend for job management (if backend orchestrates scraping jobs).
  - Implement endpoints:
    - `POST /api/v1/scraper/trigger` – enqueue scrape job(s) for one or all sites; return `jobId`, `status`.
    - `GET /api/v1/scraper/status/:jobId` – return job status and progress details.
  - Ensure `ScrapeLog` table is populated/updated with job information.
  - Coordinate contract between backend and scraper microservice for job payloads.
  - _PRD refs: 3.2.2 Scraper Management API, 3.3.1 ScrapeLog, 4.1 Backend API, 7.1 Scraping Flow_
  - Status: Not started

- [ ] 8. Configuration, environment management, and security

  - Implement configuration module for reading and validating env vars (database, Redis, ports, API version, `SCRAPER_API_KEY`).
  - Enforce API versioning prefix `/api/v1/` via Nest modules/router or global prefix.
  - Ensure database URLs and secrets are not hardcoded; rely on `.env`/Docker env.
  - Optionally add minimal rate limiting for public endpoints (future-friendly).
  - _PRD refs: 3.2.3, 6.1–6.3, 8.2–8.4_
  - Status: Not started

- [ ] 9. Testing and quality gates for backend

  - Add Jest test setup to the Nest app.
  - Implement unit tests for:
    - Services handling core business logic (product search, history range calculations, tracking create/delete).
    - Data validation and DTO transformation.
  - Implement basic integration tests for key API endpoints (products list/detail, history, tracking, bulk upload).
  - Ensure tests run in CI and locally, using SQLite or an in-memory DB for speed.
  - _PRD refs: 5.1–5.2 Testing Strategy, 9.1 MVP Success Criteria (test coverage)_
  - Status: Not started
