# Board Game Price Tracker – Clownfish Games Site Integration

## Implementation Plan

- [x] 1. Add clownfish-games site configuration
  - Create a new site config file under `scraper/config/sites` (e.g. `clownfish-games.json`).
  - Use `siteId: "clownfish-games"` and set appropriate `siteName`, `baseUrl`, `listPageUrl`, pagination selectors, `rateLimitMs`, and `isActive`.
  - Ensure the config conforms to the existing site config schema and is validated at scraper startup.

- [x] 2. Implement clownfish list-page scraping
  - Reuse the existing Playwright-based scraping flow to handle the clownfish-games list pages.
  - Starting from `https://clownfish-games.co.uk/collections/all?page=1`, implement pagination until no further pages are available.
  - For each product in the list view, extract the same fields currently captured for zatu:
    - name/title
    - current price
    - RRP/original price (if available)
    - product URL
    - image URL
    - availability / in-stock flag
    - any additional fields already supported by the normalized DTO.
  - Normalize extracted data into the shared scraper DTO used for backend bulk ingest.

- [x] 3. Integrate clownfish-games into scraper runners
  - Ensure clownfish-games is included in the standard "scrape all active sites" run.
  - Add or confirm support for targeted runs where a specific `siteId` can be passed to scrape only `"clownfish-games"`.
  - Verify that environment/config and CLI or job entrypoints support running a single-site scrape for debugging.

- [x] 4. Extend backend to recognise clownfish-games as a source
  - Add `"clownfish-games"` to any enums, constants, or configuration representing supported sites.
  - Confirm that the bulk ingest API correctly records clownfish data with the new site ID.
  - Ensure any site-based filters, aggregations, or reporting paths include the new site.

- [x] 5. Implement product linking for clownfish priceHistory rows
  - On ingest of clownfish price data, determine the canonical `Product` to link to using the following rules:
    - If `bggId` is present on the incoming record:
      - Look up an existing `Product` by `bggId` and link the new `productHistory` rows to that `productId` when found.
    - If no matching `bggId` product is found or `bggId` is null:
      - Apply the same fuzzy matching logic used for existing sites (e.g. zatu) against existing `Product` titles (and any other stable fields).
      - If the fuzzy match is above the configured threshold, link to the matched `Product`.
      - If no adequate match is found, create a new `Product` record and link the new `productHistory` rows to it.
  - Ensure that `productHistory` rows always retain both `productId` and `bggId` (when available) so that future reconciliation is possible.
  - Guarantee that no clownfish price data is dropped due to failed linkage; worst case should be creation of a new `Product`.

- [x] 6. Verify clownfish integration with aggregate `/items` data
  - Review the backend endpoint(s) that power the frontend `/items` list.
  - Confirm that clownfish `productHistory` entries are included in the aggregate dataset.
  - Ensure any site/source indicators or filters treat `"clownfish-games"` consistently with other sites (e.g. zatu, board-game-co-uk).

- [x] 7. Add `items/clownfish-games` list page (frontend)
  - Under the frontend app routes, add a new route `items/clownfish-games`.
  - Mirror the implementation of `items/zatu-uk`:
    - Use the same list layout, columns, and sorting where applicable.
    - Scope data fetching to `sourceSite = "clownfish-games"` (or equivalent filter supported by the backend).
  - Display product name, current price, site, and any other standard fields already surfaced for zatu.

- [x] 8. Add `items/clownfish-games/[itemId]` detail page (frontend)
  - Add a dynamic route `items/clownfish-games/[itemId]` mirroring `items/zatu-uk/[itemId]`.
  - Fetch the product and its price history specific to clownfish-games from the backend.
  - Reuse existing components/patterns for displaying item details (e.g. price history charts, metadata), adjusting only the site filter as needed.

- [x] 9. Confirm `/items` flat list behaviour with clownfish data
  - Verify that the existing `/items` route automatically includes clownfish data from the aggregated backend endpoint.
  - Ensure the UI clearly indicates the source site for each row so clownfish entries can be distinguished.
  - If there is an existing site filter (dropdown, chips, etc.), ensure `"clownfish-games"` appears as an option and behaves as expected.

- [x] 10. Enhance scrape logging and metadata for clownfish-games
  - Ensure that each clownfish scrape run logs structured metadata including:
    - `siteId` ("clownfish-games"), a job or run identifier, and `scrapeTimestamp`.
    - Total number of products scraped.
    - Counts of successful ingests vs. failures.
    - Any page-level or site-level error messages.
  - Align clownfish logging with existing scrape log structures so the dashboard can consume a consistent format across all sites.

- [x] 11. Expose per-site scrape status via backend API
  - Create or extend an API endpoint that returns, for each site (including clownfish-games):
    - Last successful scrape timestamp.
    - Last failed scrape timestamp and a brief error summary.
    - Last scraped item count.
  - Ensure this endpoint is efficient enough to be called periodically by the frontend dashboard.

- [x] 12. Implement `system/dashboard` frontend page
  - Add a new route at `system/dashboard` in the frontend.
  - Render a simple system dashboard showing, per site (board-game-co-uk, zatu-uk, clownfish-games, etc.):
    - Last success time.
    - Last failure time and message.
    - Last scraped item count.
  - Highlight problem states, for example:
    - No successful scrape within a configurable window.
    - Last scrape item count is zero or significantly lower than historical norms (if available).
  - For now, allow open access; plan to add authentication/authorization in a future feature.

- [ ] 13. Testing and validation
  - Scraper:
    - Add or update scripts to run a one-off clownfish-games scrape and inspect the normalized output payload.
  - Backend:
    - Add tests covering product-linking logic when:
      - Matching by `bggId`.
      - Matching by fuzzy title when `bggId` is not available.
      - Creating a new `Product` when no suitable match is found.
  - Frontend:
    - Verify `items/clownfish-games` and `items/clownfish-games/[itemId]` render correctly against seeded or test data.
    - Verify `/items` includes clownfish items and that source labelling and filtering work as expected.
    - Verify `system/dashboard` correctly displays scrape status for clownfish and other sites, and clearly surfaces error conditions.

## Next steps

- **System dashboard & monitoring**
  - Implement tasks 11–12 to expose per-site scrape status from the backend and surface it in `system/dashboard`, including clownfish, zatu, and board-game-co-uk.

- **Testing**
  - Finish task 13 by adding backend and frontend tests around product linking, new clownfish pages, and the system dashboard, building on the existing `scrape:clownfish` script for scraper validation.
