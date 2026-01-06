# Board Game Price Tracker – Infrastructure & Dev Environment – MVP

## Implementation Plan

- [ ] 1. Define environment configuration for dev and prod

  - Create `.env.development` and `.env.production` (or equivalents) matching the PRD examples.
  - Ensure variables cover:
    - `DATABASE_URL` / `SQLITE_PATH`.
    - `REDIS_HOST`, `REDIS_PORT`.
    - `API_PORT`, `API_VERSION`.
    - Scraper-related schedule and rate limits.
  - Document where these files live and how they are loaded by frontend, backend, and scraper.
  - _PRD refs: 3.2.3, 3.1.2, 6.1–6.3_
  - Status: Not started

- [ ] 2. Docker Compose setup for local development

  - Create a `docker-compose.yml` that defines services:
    - `frontend` (Next.js).
    - `backend` (NestJS API).
    - `scraper` (Playwright-based microservice).
    - `postgres` (PostgreSQL for dev/prod-like usage).
    - `redis` (for BullMQ queues).
  - Configure service dependencies and port mappings as per PRD (3000, 3001, 5432, 6379).
  - Configure volumes for Postgres data and any shared resources as needed.
  - _PRD refs: 2.3 Databases, 2.4 Infrastructure, 6.3 Docker Compose Services_
  - Status: Not started

- [ ] 3. Service wiring and network configuration

  - Ensure services can resolve each other by name within Docker Compose network (e.g. `backend`, `postgres`, `redis`).
  - Verify that:
    - Backend connects to Postgres using service name and correct port.
    - Backend connects to Redis for BullMQ.
    - Scraper connects to backend via internal hostname (e.g. `http://backend:3001`).
    - Frontend points to backend API via internal or external URL as appropriate for dev.
  - Document any hostnames/ports that must be used when running locally vs inside containers.
  - _PRD refs: 2.2 Backend, 2.3 Databases, 2.4 Infrastructure, 7.1 Data Flow_
  - Status: Not started

- [ ] 4. Database lifecycle and migrations

  - Define workflow for running Prisma migrations in both local and Dockerized environments.
  - Implement startup scripts or documented commands to:
    - Apply latest migrations to dev SQLite/Postgres.
    - Seed initial data if needed (basic products or test entries).
  - Ensure schema changes propagate cleanly across services in Compose.
  - _PRD refs: 3.3 Database Schema, 6.1–6.3_
  - Status: Not started

- [ ] 5. Local development scripts and workflow

  - Add NPM scripts or Makefile targets for common workflows:
    - `docker:up`, `docker:down`, `docker:logs`.
    - `dev:frontend`, `dev:backend`, `dev:scraper` for running services outside Docker if desired.
  - Document minimal steps to get the full system running from a clean checkout.
  - Ensure Node.js version guidance (v22 or v24) is clearly stated.
  - _PRD refs: 2.5 Runtime, 6.1 Local Development Setup, 9.1 MVP Success Criteria_
  - Status: Not started

- [ ] 6. Basic monitoring/logging and observability hooks

  - Standardize logging formats across frontend (console), backend (Nest logger), and scraper (structured logs).
  - Ensure container logs are aggregated via `docker logs` and are human-readable.
  - Prepare for future integration with monitoring tools (Prometheus, Grafana) by keeping logs structured and including key fields (service, requestId, jobId, siteId).
  - _PRD refs: 3.1.5 Error Handling, 7.1–7.2 Data Flow, 8.3 Reliability_
  - Status: Not started

- [ ] 7. Documentation and onboarding

  - Create or update a root `README` section for the price tracker that explains:
    - Overall architecture (frontend, backend, scraper, DB, Redis).
    - How to run everything locally (with and without Docker).
    - How to run tests and where feature/task docs live (`docs/features`).
  - Optionally create minimal diagrams (text-based or images) reflecting the data flows from PRD.
  - _PRD refs: 2.4 Infrastructure, 6.1–6.3, 7.1–7.2, 8.5 Maintainability, 9.1 MVP Success Criteria_
  - Status: Not started
