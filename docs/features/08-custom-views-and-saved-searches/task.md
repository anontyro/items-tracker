# Board Game Price Tracker – Phase 4: Custom Views & Saved Searches

## Implementation Plan

- [ ] 1. Backend support for derived views (price-dropped, newly in-stock)

  - Design queries or service methods to fetch:
    - Recently price-dropped products (e.g. last 24h/7d, sorted by largest drop).
    - Newly in-stock products (recent transitions from out-of-stock to in-stock).
  - Implement API endpoints or query params to expose these lists, e.g.:
    - `GET /api/v1/products?view=recentlyDropped`.
    - `GET /api/v1/products?view=newlyInStock`.
  - Ensure queries are index-friendly and scale to expected data volumes.
  - _PRD refs: 3.4.2 Homepage custom lists, 4.2 Phase 4_
  - Status: Not started

- [ ] 2. Frontend homepage custom view lists

  - Extend homepage to render configurable lists:
    - Recently price-dropped products.
    - Newly in-stock products.
    - (Future) user-saved custom searches.
  - For each item, show thumbnail (if any), name, current vs previous price, change percentage, and a quick Track button.
  - Handle empty/no-results states gracefully.
  - _PRD refs: 3.4.2 Homepage Components, 4.2 Phase 4_
  - Status: Not started

- [ ] 3. Saved search and custom view definition model

  - Design a data structure for saved searches:
    - Filters (price range, availability, sort, etc.).
    - A human-readable name.
  - For pre-auth phase, store in localStorage (`userPreferences` extension) or simple backend table for later per-user association.
  - Provide a minimal API (or local client logic) to save, list, and delete saved searches.
  - _PRD refs: 3.4.6 Local Storage, 4.2 Phase 4_
  - Status: Not started

- [ ] 4. Frontend UI for managing custom views

  - Add UI controls (on homepage or a dedicated settings page) to:
    - Choose which built-in lists to display on the homepage.
    - Create and manage saved custom searches.
  - Persist preferences (list visibility, default search sort, etc.) using `userPreferences` and/or backend once auth exists.
  - _PRD refs: 3.4.2 Custom views, 3.4.6 Local Storage, 4.2 Phase 4_
  - Status: Not started

- [ ] 5. Testing and UX validation for custom views

  - Add backend tests for derived view queries (recentlyDropped, newlyInStock) and edge cases.
  - Add frontend tests for:
    - Rendering custom lists.
    - Saved search creation/deletion.
    - Preference persistence across reloads.
  - Conduct a quick UX review for discoverability and clarity of custom view controls.
  - _PRD refs: 5.2 Testing, 4.2 Phase 4_
  - Status: Not started
