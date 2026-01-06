# Design Document — API Subdomain Migration

## Overview

This change separates the public web app and the backend API at the DNS/ingress layer to avoid route collisions and to simplify production routing:

- Next app remains at `https://gatherus.co.uk/*` (including App Router API under `/api/*`).
- Nest API moves to `https://api.gatherus.co.uk/*` served via Nginx Proxy Manager (NPM).
- Frontend calls the backend through `API_BASE_URL` so server/client code consistently targets `https://api.gatherus.co.uk`.

Primary drivers:

- Remove ingress rule collision where `/api/*` on the main host shadowed Next API routes.
- Clear separation of concerns for caching, security controls, and observability.

## Architecture

- DNS (Cloudflare)

  - `api.gatherus.co.uk` -> NPM public IP (A/AAAA/CNAME). Orange-cloud (proxied) preferred; choose issuance method accordingly.

- Ingress (Nginx Proxy Manager)

  - Proxy Host 1: `gatherus.co.uk` -> Next frontend container/service.
    - No custom `Location /api` to backend.
    - Force SSL, HTTP/2, HSTS, WebSockets enabled as appropriate.
  - Proxy Host 2: `api.gatherus.co.uk` -> Nest backend container/service on port 3000.
    - Force SSL, HTTP/2, HSTS, WebSockets.
    - Optional: Access Lists, rate limiting.

- Frontend Configuration

  - `packages/frontend/src/utils/session.ts#getApiEndpoint()` uses `process.env.API_BASE_URL`.
  - In production, set `API_BASE_URL=https://api.gatherus.co.uk`.
  - Next API routes keep `/api/*` locally; they proxy/fetch to the backend using `getApiEndpoint()`.

- Backend Configuration

  - CORS in `packages/api/src/main.ts` allows `https://gatherus.co.uk` (already default in production path). Add preview domains if needed.
  - No `/api` global prefix is set in Nest; controllers are rooted at their resource paths (e.g., `/events`, `/health`).

- Observability & Versioning
  - Backend logs version and build SHA on startup (`packages/api/src/main.ts`).
  - Frontend should also log/build-tag (e.g., in a startup log or `/api/version` route) for cross-service deployment verification.
  - Follow team practice: bump versions to verify production rollout in logs.

## Traffic Flow

1. Browser -> Cloudflare -> NPM (TLS termination may be at CF or NPM depending on proxy mode).
2. `https://gatherus.co.uk/*` -> Next app.
3. `https://gatherus.co.uk/api/*` -> Next App Router API handlers (no longer shadowed by backend).
4. Next API/SSR fetches to `https://api.gatherus.co.uk/...` using `getApiEndpoint()`.
5. `https://api.gatherus.co.uk/*` -> Nest backend service (port 3000).

## Security Considerations

- TLS everywhere; HSTS enabled on both hosts.
- Validate CORS origins and credentials settings on backend.
- Consider enabling NPM Access Lists and/or rate limits on `api.gatherus.co.uk` if necessary.
- Ensure sensitive headers are forwarded correctly (e.g., `X-Forwarded-Proto`) to maintain secure cookie behavior.

## Rollback Strategy (Design)

- Keep prior NPM config export; rollback by restoring `/api` location on `gatherus.co.uk` or reverting `API_BASE_URL`.
- DNS can remain pointed at NPM; functional rollback is at ingress/env level.

## References

- Frontend base URL helper: `packages/frontend/src/utils/session.ts#getApiEndpoint()`
- API CORS setup: `packages/api/src/main.ts`
- Events controller base path: `packages/api/src/events/events.controller.ts`
