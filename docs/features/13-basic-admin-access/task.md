# Feature 13: Basic Admin Access & Catalog Editing

This feature introduces a minimal, secure admin capability to inspect and edit games in the catalog (e.g. correcting names, types, and BGG IDs) without building a full multi-user authentication system.

## Implementation Plan

1. [ ] **Define basic admin auth model and configuration**

   - [ ] Add backend environment variables (documented in `backend/.env.example`):
     - [ ] `ADMIN_PASSWORD` – a strong, random password for the single admin account.
     - [ ] `ADMIN_SESSION_SECRET` – secret used to sign/verifiy admin sessions or tokens.
   - [ ] Decide on session mechanism (keep it simple):
     - [ ] Option A: HTTP-only signed cookie (e.g. `admin_session`).
     - [ ] Option B: short-lived signed bearer token returned by the login endpoint.
   - [ ] Ensure this feature is clearly **single-admin-only** for MVP to avoid scope creep into full auth.

2. [ ] **Implement admin login endpoint in backend**

   - [ ] Add an `AdminAuthModule` to the NestJS backend.
   - [ ] Implement `POST /v1/admin/login` endpoint that:
     - [ ] Accepts `{ password: string }` in the body.
     - [ ] Compares the provided password against `ADMIN_PASSWORD` using a constant-time comparison.
     - [ ] On success, issues a signed session (cookie or token) and returns a generic success payload.
     - [ ] On failure, returns `401 Unauthorized` without revealing which part failed.
   - [ ] Add basic logging for login attempts (without logging the raw password).

3. [ ] **Create an AdminAuthGuard for protected routes**

   - [ ] Implement a NestJS guard (e.g. `AdminAuthGuard`) that:
     - [ ] Parses the admin session from the chosen mechanism (cookie or bearer token).
     - [ ] Verifies the signature using `ADMIN_SESSION_SECRET`.
     - [ ] Attaches an `isAdmin` flag to the request context when valid.
   - [ ] Return `401 Unauthorized` when the session is missing or invalid.
   - [ ] Apply this guard to all `/v1/admin/*` routes.

4. [ ] **Add admin catalog endpoints for Products**

   - [ ] Create an `AdminProductsController` under `/v1/admin/products` that is protected by `AdminAuthGuard`.
   - [ ] Implement endpoints such as:
     - [ ] `GET /v1/admin/products` – list/search products, with filters like:
       - [ ] `q` (search by name substring)
       - [ ] `hasBggId` (true/false) to find products missing BGG IDs.
     - [ ] `GET /v1/admin/products/:id` – fetch details for a single product, including related `ProductSource` entries and recent `PriceHistory`.
     - [ ] `PATCH /v1/admin/products/:id` – allow updating editable fields:
       - [ ] `name`
       - [ ] `type`
       - [ ] `bggId` (optional; may be set manually or cleared)
   - [ ] Validate input on updates (e.g. non-empty names, correct types, optional `bggId` format checks).

5. [ ] **(Optional) BGG-assisted admin tools**

   - [ ] Add an admin-only endpoint to search BGG reference data (`BggGame`, from Feature 12):
     - [ ] `GET /v1/admin/bgg/search?query=ark%20nova` – returns top candidate BGG games.
   - [ ] Add an endpoint to associate a BGG entry with a product:
     - [ ] `POST /v1/admin/products/:id/bgg` with body `{ bggId: string }`.
     - [ ] Validates that the `bggId` exists in `BggGame` and is not already in use by another product.

6. [ ] **Minimal admin UI (for later frontend integration)**

   - [ ] Plan for a basic admin area in the frontend (Next.js) that will use these APIs:
     - [ ] `/admin/login` – password field posting to `POST /v1/admin/login`.
     - [ ] `/admin/products` – search and filter products; highlight missing `bggId` entries.
     - [ ] `/admin/products/:id` – form to edit name/type/BGG ID, and view linked sources and latest prices.
   - [ ] Keep UX simple and focused on correction workflows rather than full user management.

7. [ ] **Security & operational considerations**
   - [ ] Require HTTPS in deployed environments for admin endpoints so the admin password and session are not sent in clear text.
   - [ ] Add basic rate limiting or throttling to `/v1/admin/login` to mitigate brute-force attempts.
   - [ ] Ensure admin-only routes are clearly separated from public routes in logging and monitoring.
   - [ ] Document how to rotate `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (and how that affects existing sessions).

---

**Dependencies / Notes:**

- This feature is designed to be independent of the BGG populating pipeline (Feature 12), but can optionally leverage `BggGame` to assist with manual linking.
- There is intentionally no concepts of users, roles, or registration for MVP; the admin is a single, env-configured account.
- Frontend admin pages can be added in a later phase, consuming the `/v1/admin/*` APIs defined here.
