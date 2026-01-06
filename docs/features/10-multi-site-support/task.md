# Board Game Price Tracker – Phase 6: Multi-Site Support

## Implementation Plan

- [ ] 1. Extend configuration and data model for multiple retailers

  - Define or reuse a `Site` concept across scraper and backend:
    - Ensure each site has a stable `siteId` and human-readable name.
  - Validate that `ProductSource` and `ScrapeLog` schemas adequately represent multiple sites (sourceName, siteId, etc.).
  - Plan for cross-site product matching strategy (SKU, name heuristics, or manual mapping) – implement a minimal version for Phase 6.
  - _PRD refs: 3.1.3 Site Configuration, 3.3.1 ProductSource/ScrapeLog, 4.2 Phase 6_
  - Status: Not started

- [ ] 2. Scraper support for additional sites

  - Add new site configuration JSON files for additional board game retailers.
  - Ensure scraper runner can:
    - Iterate through all active sites.
    - Respect per-site rate limits and pagination rules.
  - Verify bulk upload payload includes `siteId` and `sourceName` as expected.
  - _PRD refs: 3.1.3–3.1.4, 4.2 Phase 6_
  - Status: Not started

- [ ] 3. Backend APIs with site awareness

  - Extend product and history queries to support filtering by site and/or aggregating across sites.
  - Add optional query params such as `siteId` or `sourceName` to `/api/v1/products` and history endpoints.
  - Ensure pagination and performance remain acceptable with additional sites.
  - _PRD refs: 3.2.2 Products API, 3.3.1 Models, 4.2 Phase 6_
  - Status: Not started

- [ ] 4. Cross-site product unification (minimal pass)

  - Implement a simple matching process to unify the same product across sites:
    - Start with SKU or exact name matches.
    - Optionally introduce a manual mapping table for ambiguous cases.
  - Update UI/DTOs to present combined product views (e.g. best price across sites) where appropriate.
  - _PRD refs: 4.2 Phase 6 (cross-site product matching), 3.3.1 Product/ProductSource_
  - Status: Not started

- [ ] 5. Frontend UI for multi-site browsing

  - Add filters or switching controls on search and product pages to:
    - Filter by individual site.
    - Show combined or per-site price information.
  - Clearly indicate which retailer each price comes from.
  - _PRD refs: 3.4.3 Product Search Page, 3.4.4 Product Detail Page, 4.2 Phase 6_
  - Status: Not started

- [ ] 6. Testing and validation for multi-site behaviour

  - Add tests for multi-site scraper configurations and bulk upload handling.
  - Add backend tests for site-aware queries and cross-site product matching.
  - Add frontend tests to ensure filters and site indicators behave correctly.
  - _PRD refs: 5.2 Testing, 4.2 Phase 6_
  - Status: Not started
