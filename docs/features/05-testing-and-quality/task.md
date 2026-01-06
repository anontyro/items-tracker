# Board Game Price Tracker – Testing & Quality – MVP

## Implementation Plan

- [ ] 1. Define testing strategy, tooling, and coverage targets

  - Confirm Jest as the primary test framework across backend, frontend, and scraper services.
  - Align on minimum coverage targets for MVP (e.g. >50% overall, >70% on critical paths as per PRD).
  - Decide on directory conventions (e.g. `__tests__` folders vs `*.spec.ts` colocated) for each service.
  - Document which flows are considered "critical" for MVP (scraping pipeline, core API endpoints, key frontend pages).
  - _PRD refs: 5.1 Testing Framework, 5.2 Test Types, 9.1 MVP Success Criteria_
  - Status: Not started

- [ ] 2. Backend (NestJS + Prisma) unit tests

  - Set up Jest configuration for the Nest backend (if not already present).
  - Add unit tests for service-layer business logic in:
    - Products module (search, filter, sort, pagination logic).
    - Price history module (range calculations, DTO mapping for charts).
    - Tracking module (creation/deletion rules, validation of conditions for MVP `general` tracking).
  - Add tests for data transformation and validation utilities (e.g. mapping DB models to API response DTOs).
  - Ensure tests run quickly using SQLite or in-memory DB mocks where possible.
  - _PRD refs: 5.2 Unit Tests (Backend), 3.2.1–3.2.2, 3.3_
  - Status: Not started

- [ ] 3. Backend integration tests (API + database)

  - Implement integration tests using Nest’s testing utilities to spin up the app with a real (test) database.
  - Cover key endpoints:
    - `GET /api/v1/products` (search, filters, pagination).
    - `GET /api/v1/products/:id` and `/api/v1/products/:id/history` (range behavior, ordering).
    - `POST /api/v1/scraper/bulk-upload` (valid/invalid payloads, upsert behavior, auth via `SCRAPER_API_KEY`).
    - `GET/POST/DELETE` tracking endpoints for basic `general` tracking.
  - Use test fixtures or seed data to verify price histories, availability states, and index usage.
  - _PRD refs: 5.2 Integration Tests, 3.2.2 Products/Tracking/Bulk Upload APIs, 3.3.1 Models_
  - Status: Not started

- [ ] 4. Frontend unit and component tests (Next.js)

  - Configure Jest + React Testing Library for the Next.js app.
  - Add unit tests for:
    - Data formatting helpers (currency/percentage display, trend arrows).
    - LocalStorage utilities for `trackedProducts` and `userPreferences`.
  - Add component tests for key UI pieces:
    - Tracked item card (name, price, sparkline, availability badge, track button).
    - Product search results list (search/filter props, empty state handling).
    - Price history chart wrapper (time range selection logic, loading/error states).
  - _PRD refs: 5.2 Unit Tests (Frontend), 3.4.2–3.4.6, 4.1 Frontend_
  - Status: Not started

- [ ] 5. Frontend integration tests for critical flows

  - Implement a small set of higher-level tests (RTL + mocked API) for:
    - Product search flow: user enters search term, sees filtered results.
    - Product detail flow: navigating to `/products/[id]` and seeing chart + history table basics.
    - Tracking flow: clicking "Track" / "Untrack" updates UI and localStorage.
  - Ensure tests simulate realistic backend responses (using MSW or similar where appropriate).
  - _PRD refs: 5.2 Integration Tests, 7.2 User Tracking Flow, 9.1 MVP Success Criteria_
  - Status: Not started

- [ ] 6. Scraper service tests

  - Configure Jest for the scraper microservice (Node/TS).
  - Add unit tests for:
    - Site config loader and validation (required fields, `isActive` behavior).
    - HTML parsing and normalization logic (mapping selectors to DTO fields).
    - Retry and error handling logic (MAX_RETRIES, RETRY_DELAY).
  - Add integration-style tests that:
    - Mock Playwright page interactions.
    - Verify bulk upload payload structure sent to the backend client.
  - _PRD refs: 5.2 Unit & Integration Tests (Scraper), 3.1.3–3.1.5, 7.1 Scraping Flow_
  - Status: Not started

- [ ] 7. Cross-service end-to-end smoke tests (minimal MVP)

  - Design a minimal E2E scenario (can be manual or automated initially):
    - Trigger a scrape (manual or scheduled).
    - Confirm data is saved in the database (products + price history rows).
    - Confirm frontend can search and display the newly scraped product.
    - Track an item and confirm it appears in the homepage tracked list with a sparkline.
  - Optionally, set up an automated E2E test harness (e.g. Playwright or Cypress) to run this scenario in CI later.
  - _PRD refs: 5.2 E2E Tests (Future), 7.1–7.2 Data Flows, 9.1 Success Criteria_
  - Status: Not started

- [ ] 8. CI integration and quality gates

  - Update or create a GitHub Actions workflow that:
    - Installs dependencies for frontend, backend, scraper.
    - Runs type checks and linters.
    - Runs all Jest test suites.
    - Fails the pipeline if coverage thresholds are not met (for agreed critical paths).
  - Ensure test artifacts (coverage reports) are generated and accessible.
  - _PRD refs: 6.2 Production Deployment (CI/CD), 5.1–5.2 Testing, 9.1 MVP Success Criteria_
  - Status: Not started

- [ ] 9. Testing documentation and checklist

  - Add a short `TESTING.md` (or README section) describing:
    - How to run tests for each service.
    - Where to find coverage reports.
    - Which scenarios must be manually verified before an MVP release.
  - Create a simple release checklist referencing this feature doc and key test suites.
  - _PRD refs: 5.1–5.2 Testing Strategy, 8.5 Maintainability_
  - Status: Not started
