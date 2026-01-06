# Board Game Price Tracker – Frontend UI (Next.js) – MVP

## Implementation Plan

- [ ] 1. Frontend project setup and global configuration

  - Create/configure a Next.js 16 app with TypeScript and Tailwind CSS.
  - Configure base layout, global styles, and shared UI components folder.
  - Decide on data fetching library (SWR or React Query) and set up a simple API client abstraction.
  - Configure environment variables for backend API base URL (e.g. `NEXT_PUBLIC_API_BASE_URL`).
  - _PRD refs: 2.1 Frontend Stack, 3.4, 6.1–6.3_
  - Status: Not started

- [ ] 2. API client utilities and shared types

  - Define shared TypeScript types for `Product`, `PriceHistoryEntry`, `TrackedItem`, matching backend responses.
  - Implement API helper functions/hooks:
    - `useProductsList` (search, filter, pagination).
    - `useProductDetails` and `useProductHistory` (range parameter support).
    - `useTrackedItems` and `useTrackingActions` (list, add, remove).
  - Handle loading, error, and empty states consistently.
  - _PRD refs: 3.2.2 Products/Tracking APIs, 3.4.2–3.4.5_
  - Status: Not started

- [ ] 3. Homepage with tracked items and custom views (MVP slice)

  - Implement `/` page layout with sections:
    - Tracked items overview.
    - Optionally, simple lists like “recently price-dropped” (MVP-lite based on available data).
  - For each tracked item, display:
    - Product name and current price.
    - Price change indicator (up/down/flat with percentage where possible).
    - Availability status.
    - Sparkline showing recent price history (using Recharts mini chart).
  - Connect to backend APIs to fetch tracked items and their recent history.
  - _PRD refs: 3.4.2 Homepage Components, 4.1 Frontend_
  - Status: Not started

- [ ] 4. Product search and browse page

  - Implement `/products` page that lists products with:
    - Search by name.
    - Filters: price range, availability.
    - Sorting options (price, name, recentlyAdded, priceChange).
    - Pagination controls.
  - Integrate with `GET /api/v1/products` endpoint using API client hooks.
  - Provide basic summary (current price, availability, recent price movement) for each product row/card.
  - _PRD refs: 3.2.2 Products API, 3.4.3 Product Search Page, 4.1 Frontend_
  - Status: Not started

- [ ] 5. Product detail page with full price history

  - Implement `/products/[id]` route to display detailed product information.
  - Fetch product details + history using dedicated hooks.
  - Implement a Recharts-based history chart supporting time ranges: 7d, 30d, 90d, all.
  - Visualize out-of-stock periods (e.g. shaded regions or markers based on availability in history data).
  - Add summary statistics (min/max price, last change date) where straightforward.
  - _PRD refs: 3.2.2 Product detail/history, 3.4.4 Product Detail Page, 4.1 Frontend_
  - Status: Not started

- [ ] 6. Tracking management page and track/untrack UI

  - Implement `/tracking` page with:
    - List of tracked items (table or cards) and their current tracking conditions.
    - Actions to remove tracking for an item.
  - Add `Track` / `Untrack` controls to relevant UI locations:
    - Product list entries.
    - Product detail page.
  - Implement basic MVP tracking behavior:
    - `general` track type only for now.
    - Sync with backend tracking endpoints and localStorage structure defined in PRD.
  - _PRD refs: 3.2.2 Tracking API, 3.4.5 Tracking Management, 3.4.6 Local Storage, 4.1 Frontend_
  - Status: Not started

- [ ] 7. Local storage integration and user preferences (MVP scope)

  - Implement localStorage helpers for:
    - `trackedProducts` (as per PRD structure: productId, addedAt, conditions).
    - `userPreferences` (home view lists, default search sort, notificationsEnabled).
  - Ensure state is hydrated from localStorage on mount and written back on relevant events.
  - Provide sensible defaults when localStorage is empty.
  - _PRD refs: 3.4.6 Local Storage, 3.4.7 State Management_
  - Status: Not started

- [ ] 8. Responsive design and UI polish

  - Ensure all core pages (`/`, `/products`, `/products/[id]`, `/tracking`) are responsive for desktop and mobile.
  - Use Tailwind CSS to define a basic design system (colors, spacing, typography, card and table styles).
  - Verify chart components render well on small screens and handle long labels or many data points gracefully.
  - _PRD refs: 2.1 Frontend Stack, 3.4, 8.1 Performance_
  - Status: Not started

- [ ] 9. Frontend testing and QA

  - Add Jest/React Testing Library setup for the Next.js app.
  - Implement unit tests for:
    - Data formatting helpers (price/percentage formatting, trend indicators).
    - Key presentational components (tracked item card, history chart wrapper).
  - Implement a small set of integration tests for core flows (e.g. product search, view detail, add/remove tracking), where feasible.
  - Document manual QA checklist for MVP pages (load times, mobile layout sanity checks).
  - _PRD refs: 5.1–5.2 Testing, 9.1 MVP Success Criteria_
  - Status: Not started
