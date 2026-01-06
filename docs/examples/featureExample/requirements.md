# Requirements Document — API Subdomain Migration

## Introduction

Migrate the backend API to a dedicated subdomain (`api.gatherus.co.uk`) using Nginx Proxy Manager (NPM) and Cloudflare DNS. This removes the current production collision where `/api/*` on `gatherus.co.uk` is routed directly to Nest, shadowing Next.js App Router API routes. The migration cleanly separates concerns and simplifies routing, caching, and observability.

## Requirements

### Requirement R1 — DNS

- Cloudflare record for `api.gatherus.co.uk` must point to the public IP of NPM (A/AAAA or CNAME). Prefer proxied (orange-cloud) if TLS and certificates support it.

### Requirement R2 — TLS

- Valid HTTPS certificate must be issued for `api.gatherus.co.uk` via NPM (Let’s Encrypt). If Cloudflare proxy is ON, use DNS-01 or temporarily disable proxy (gray-cloud) to complete HTTP-01.

### Requirement R3 — NPM Routing (API Host)

- New Proxy Host for `api.gatherus.co.uk` that forwards to the backend service on port 3000. Enable Force SSL, HTTP/2, HSTS, and WebSockets.

### Requirement R4 — NPM Cleanup (Main Host)

- `gatherus.co.uk` Proxy Host must not route `/api/*` to the backend. All `/api/*` requests should be handled by the Next app.

### Requirement R5 — Frontend Configuration

- Production `API_BASE_URL` must be set to `https://api.gatherus.co.uk` so `packages/frontend/src/utils/session.ts#getApiEndpoint()` constructs correct backend URLs.

### Requirement R6 — Backend CORS

- CORS in `packages/api/src/main.ts` must allow `https://gatherus.co.uk` (default) and include any preview domains as necessary.

### Requirement R7 — Observability & Versioning

- Both frontend and backend must log version/build SHA at startup and/or expose `/version` in health endpoints to verify production rollouts (aligns with team’s deployment verification practice).

### Requirement R8 — CI/CD and Secrets

- Deployment environments/pipelines must be updated to include the new `API_BASE_URL` and any infra variables. If using DNS-01 in NPM, Cloudflare API credentials must be securely configured.

### Requirement R9 — Validation

- End-to-end smoke tests must verify API health (`/health`), events filtering, and that Next API routes on `gatherus.co.uk/api/*` execute and proxy correctly to the backend.

### Requirement R10 — Rollback

- A documented rollback must exist to restore prior NPM config or revert `API_BASE_URL`, including expected recovery time and checkpoints.
