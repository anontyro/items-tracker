# Board Game Price Tracker – Phase 3: Wishlists & Organisation

## Implementation Plan

- [ ] 1. Enable wishlist models and endpoints on backend

  - Ensure `Wishlist` and `WishlistItem` models are present in Prisma schema as per PRD.
  - Implement `WishlistModule` in Nest with:
    - `GET /api/v1/wishlists` – list user wishlists.
    - `POST /api/v1/wishlists` – create wishlist.
    - `GET /api/v1/wishlists/:id` – fetch single wishlist with items.
    - `PUT /api/v1/wishlists/:id` – update name/description.
    - `DELETE /api/v1/wishlists/:id` – delete wishlist.
    - `POST /api/v1/wishlists/:id/items` – add product to wishlist.
    - `DELETE /api/v1/wishlists/:id/items/:productId` – remove product.
  - For pre-auth phase, keep `userId` optional or use a temporary identifier; plan for upgrading when auth lands.
  - _PRD refs: 3.2.2 Wishlist API, 3.3.1 Wishlist/WishlistItem, 4.2 Phase 3_
  - Status: Not started

- [ ] 2. Frontend wishlist management UI

  - Implement `/wishlists` page (read-only or full CRUD depending on auth state):
    - List existing wishlists with basic metadata and item counts.
    - Allow creating, updating, deleting wishlists.
  - On wishlist detail view, show products with price, availability, and link to detail page.
  - Reuse existing product card components where possible.
  - _PRD refs: 3.4.1 Routes (`/wishlists`), 3.4.4 Product Detail (Add to Wishlist button), 4.2 Phase 3_
  - Status: Not started

- [ ] 3. "Add to wishlist" flows from product and tracking views

  - Add an "Add to wishlist" button on product detail page (and optionally product list cards).
  - Provide a minimal selector UI to choose which wishlist to add to (or create a new one inline).
  - Support removing items from a wishlist from both the wishlist detail page and product detail page.
  - _PRD refs: 3.4.4 Product Detail Page, 4.2 Phase 3_
  - Status: Not started

- [ ] 4. LocalStorage and pre-auth support (optional MVP+)

  - If full authentication is not yet available, design a temporary storage mechanism:
    - Use localStorage to mirror wishlist state per browser.
    - Sync between localStorage and backend when user later signs in (migration plan for Phase 5).
  - Clearly document any limitations (per-device wishlists, no cross-device sync until auth).
  - _PRD refs: 3.4.6 Local Storage, 4.2 Phase 3, 4.2 Phase 5 (future auth)_
  - Status: Not started

- [ ] 5. Testing and validations for wishlists

  - Backend unit/integration tests for wishlist CRUD and item add/remove flows.
  - Frontend tests for wishlist pages and "Add to wishlist" buttons.
  - Optional E2E flow: user creates wishlist, adds items from search/product detail, and verifies they appear with correct pricing.
  - _PRD refs: 5.2 Testing, 4.2 Phase 3_
  - Status: Not started
