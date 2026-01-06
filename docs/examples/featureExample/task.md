# API Subdomain Migration (Nginx Proxy Manager + Cloudflare)

## Implementation Plan

- [ ] 1. Inventory Current Routing (NPM)

  - Export/record current NPM Proxy Host for `gatherus.co.uk` (and any custom locations such as `/api`).
  - Verify upstream target for frontend and backend.
  - _Requirements: R3, R4_

- [x] 2. DNS Provisioning (Cloudflare)

  - Create `api` DNS record pointing to NPM public IP (A or CNAME).
  - Decide certificate issuance strategy: orange-cloud (DNS-01) or gray-cloud temporarily (HTTP-01).
  - _Requirements: R1, R2_
  - Status: Completed 2025-08-18 — Cloudflare in front; `curl` shows Cloudflare headers for `api.gatherus.co.uk`.

- [x] 3. TLS Certificate (NPM)

  - In NPM, request a Let's Encrypt certificate for `api.gatherus.co.uk`.
  - If using Cloudflare DNS-01, configure the appropriate DNS provider in NPM; otherwise temporarily disable proxy (gray-cloud) for issuance, then re-enable.
  - _Requirements: R2_
  - Status: Completed 2025-08-18 — HTTPS working for `api.gatherus.co.uk`.

- [x] 4. Create API Proxy Host (NPM)

  - Hostname: `api.gatherus.co.uk`.
  - Scheme/Forwarding: `http://<backend_service_or_host>:3000` (Docker network name like `api:3000`, or the backend VM IP:3000).
  - SSL: Force SSL, enable HTTP/2, HSTS; enable Websockets.
  - Access Lists/Rate Limits: optional based on security posture.
  - _Requirements: R3_
  - Status: Completed — NPM host created (11 July 2025) forwarding to `http://api:3000`.

- [x] 5.  Update Main Host (NPM)
- `gatherus.co.uk` Proxy Host should forward all `/*` to the Next app only.
- Remove any `Location /api` that forwards to backend.
- Confirm that `https://gatherus.co.uk/api/*` now hits Next (not backend).
- _Requirements: R4_
- Status: Completed 2025-08-18 — Removed `/api` custom location in NPM. Validation shows Next handling `/api` (no `x-powered-by: Express`).

- [x] 6. Frontend Configuration

  - Set production env `API_BASE_URL=https://api.gatherus.co.uk` (e.g., in Vercel/Netlify/PM2/Docker envs).
  - Validate `packages/frontend/src/utils/session.ts#getApiEndpoint()` uses `API_BASE_URL`.
  - _Requirements: R5_
  - Note: Unify site origin var — prefer `NEXT_PUBLIC_BASE_URL` (deprecate `NEXT_PUBLIC_SITE_URL`/`SITE_URL`) in SSR pages.
  - Status: Completed 2025-08-18 — Env corrected to `https` and verified OAuth/profile flow.

- [x] 7. Backend CORS Validation

  - Ensure `packages/api/src/main.ts` CORS `allowedOrigins` includes `https://gatherus.co.uk` (default) and add preview domains if necessary.
  - _Requirements: R6_
  - Status: Completed — Code defaults to include `https://gatherus.co.uk` in production.

- [x] 8. Observability & Versioning

  - Confirm API logs version/sha on startup (already present in `packages/api/src/main.ts`).
  - Add/verify a simple version log in the Next frontend (e.g., log on boot or `/api/version`).
  - Bump versions to verify deployment in logs as per team practice.
  - _Requirements: R7_
  - Status: Completed 2025-08-18 — Added Next `/api/version` and bumped frontend to `0.1.8`.

- [x] 9. CI/CD & Secrets

  - Update build/deploy pipelines to include `API_BASE_URL` for production.
  - Rotate or add any required secrets (if using DNS-01 via Cloudflare, API tokens for NPM).
  - _Requirements: R8_
  - Status: Completed 2025-08-18 — Documented `API_BASE_URL` and `NEXT_PUBLIC_BASE_URL` in `docker/production/.env.example`; deployment uses runtime env.

- [x] 10. Validation / Smoke Tests

  - `https://api.gatherus.co.uk/health` → `{ status: 'ok' }`.
  - `https://gatherus.co.uk/api/events/filtered?...` → handled by Next API route; verify Next logs and successful proxy to backend.
  - Frontend pages load events without SSR fallback errors.
  - _Requirements: R9_
  - Status: Completed 2025-08-18 — Health OK; Next API 200; OAuth login works; pages render events without SSR fallback.

- [x] 11. Rollback Plan
  - Keep previous NPM config export to restore if needed.
  - Revert `API_BASE_URL` to old value and/or reintroduce `/api` location mapping temporarily.
  - Document time to recover and checkpoints.
  - _Requirements: R10_
  - Status: Completed 2025-08-18 — Rollback guide at `docs/ops/rollback/api-subdomain-migration.md`; includes NPM backup alternatives and TTR.
