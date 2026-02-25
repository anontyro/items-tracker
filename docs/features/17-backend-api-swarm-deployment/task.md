# Board Game Price Tracker – Backend API Swarm Deployment & Prod Postgres

## Implementation Plan

- [ ] 1. Containerise the backend API service

  - Add a production-ready `Dockerfile` under `backend/` (multi-stage build):
    - Use a Node.js base image compatible with the current backend (e.g. `node:20-alpine`).
    - Install dependencies, build the TypeScript code, and copy only the compiled output + `node_modules` required for runtime into the final image.
    - Expose `API_PORT` (default 3005) and ensure the container listens on that port.
    - Ensure `DATABASE_URL` is read from the environment and passed through to Prisma.
    - On container start, run `prisma migrate deploy` against the configured Postgres DB before starting the HTTP server.
  - Verify locally:
    - Build the image (e.g. `docker build -t items-tracker-api:local ./backend`).
    - Run it with a local Postgres instance using `DATABASE_URL` pointing at the existing `site_items_tracker` DB.
    - Hit the health endpoint and at least one core API route to confirm it boots and can talk to Postgres.

- [ ] 2. Define production backend stack and environment on the server

  - Choose and document server layout for the items tracker:
    - Stack name: e.g. `items-tracker`.
    - Root directory on server: e.g. `/opt/items-tracker`.
    - Environment file: e.g. `/opt/items-tracker/secrets/.env` (owned by root, readable by the deploy user).
  - Create a dedicated `stack.yml` for the items tracker backend on the server, modelled on `docs/examples/deploy/stack.yml` but **without** defining its own Postgres service:
    - Define an `api` service using the items-tracker backend image (see section 3 for image naming).
    - Set environment variables for DB connectivity using the shared production Postgres instance:
      - `DATABASE_HOST=postgres` (service name of the existing Postgres service in the other stack).
      - `DATABASE_PORT=5432`.
      - `DATABASE_NAME=<prod db name for items tracker>`.
      - `DATABASE_USER=<prod db user>`.
      - `DATABASE_PASSWORD=<prod db password>`.
      - `DATABASE_URL=postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`.
    - Attach the `api` service to the same Swarm overlay network that the existing `postgres` service is on (mark that network as `external: true` in `stack.yml`).
    - Publish a port for initial access via IP + port (e.g. `API_PUBLISH_PORT=3005` → `3005:3005`), to be fronted by Nginx Proxy Manager later.
    - Add a basic healthcheck hitting the backend `/health` endpoint.
  - Create and secure the server-side `.env` file for this stack:
    - Include at minimum: `IMAGE_TAG`, `API_PUBLISH_PORT`, DB credentials, and any secrets needed by the backend.
    - Ensure permissions and ownership follow the same pattern as the existing events app (`root:deploy`, `chmod 660`).

- [ ] 3. GitHub Actions workflow for build, push, and Swarm deploy

  - Add a new workflow under `.github/workflows/` for the items-tracker backend (similar to `docs/examples/deploy/deploy.yml`):
    - Trigger: `on: push: branches: [main]`.
    - Steps:
      - Checkout the repo.
      - Log in to Docker Hub using `DOCKER_HUB_USERNAME` and `DOCKER_HUB_TOKEN` secrets.
      - Compute a short SHA (e.g. `SHORT_SHA=${GITHUB_SHA::7}`).
      - Build and push the backend API image using the `backend/Dockerfile`:
        - Tags:
          - `alexjohnwilkinson/items-tracker-api:latest`.
          - `alexjohnwilkinson/items-tracker-api:sha-${SHORT_SHA}`.
      - Deploy to the Swarm server via SSH (using `appleboy/ssh-action`):
        - Call a server-side `deploy.sh` script under `/opt/items-tracker/deploy.sh` with `sha-${SHORT_SHA}`.
        - After deployment, inspect the Swarm service update status and hit a version/health endpoint for observability.
  - Ensure required GitHub Secrets are configured for this repo:
    - `DOCKER_HUB_USERNAME`, `DOCKER_HUB_TOKEN`.
    - `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY` for SSH access to the server.

- [ ] 4. Server-side deploy script for the items-tracker backend

  - Create `/opt/items-tracker/deploy.sh` on the server, modelled on `docs/examples/deploy/deploy.sh`:
    - Accepts an image tag argument (e.g. `sha-abcdef1`) and an optional `--force` flag.
    - Updates the `IMAGE_TAG` entry in `/opt/items-tracker/secrets/.env` in-place.
    - Exports variables from the env file for stack substitution.
    - Optionally pre-pulls `alexjohnwilkinson/items-tracker-api:${IMAGE_TAG}` to speed up rollout.
    - Runs `docker stack deploy -c /opt/items-tracker/stack.yml items-tracker --with-registry-auth`.
    - If `--force` is passed, runs `docker service update --force items-tracker_api` to trigger a rolling restart.
  - Document how to run the script manually for troubleshooting (e.g. `./deploy.sh sha-abcdef1 --force`).

- [ ] 5. Production Postgres schema and data migration runbook

  - **Assume** there is an existing Postgres instance running in Swarm with a `postgres` service and that it hosts multiple databases.
  - On the Postgres server (or via `psql` into the `postgres` service), create the items-tracker DB and user if not already created:
    - Example commands (to be adapted to the actual roles/policies):
      - `CREATE DATABASE site_items_tracker_prod;`
      - `CREATE USER site_items_tracker_user WITH PASSWORD '<secure-password>';`
      - `GRANT ALL PRIVILEGES ON DATABASE site_items_tracker_prod TO site_items_tracker_user;`.
  - From a trusted machine (or a one-off container), run Prisma migrations against the production DB:
    - Set `DATABASE_URL` to point at the prod DB (`postgresql://site_items_tracker_user:<password>@postgres:5432/site_items_tracker_prod`).
    - Run `prisma migrate deploy` from the `backend/` project to ensure the schema matches the current application state.
  - Perform a one-off data migration from local to production using `pg_dump` / `pg_restore`:
    - Take a dump of the local `site_items_tracker` DB (from your development machine or local Docker):
      - `pg_dump --format=c --no-owner --no-acl -h localhost -U <local_user> site_items_tracker > site_items_tracker.backup`.
    - Restore into the production DB (ensuring the schema is compatible with the current Prisma migrations):
      - `pg_restore --clean --no-owner --no-acl -h <prod_postgres_host_or_service> -U site_items_tracker_user -d site_items_tracker_prod site_items_tracker.backup`.
    - If connecting via Swarm, run `pg_restore` from a temporary container attached to the same network as the `postgres` service.
  - Validate the migration:
    - Compare row counts for key tables between local and production.
    - Start the backend API container in Swarm pointing at the prod DB and run a small set of smoke tests (e.g. hit list endpoints) to confirm data and schema alignment.

- [ ] 6. Backend configuration for dev vs production databases

  - Introduce separate env files for local development and production-oriented runs:
    - `.env.dev` – default for local development:
      - `DATABASE_HOST=localhost`, `DATABASE_NAME=site_items_tracker`, `DATABASE_USER=user`, `DATABASE_PASSWORD=password` (matching the current `backend/.env.example`).
      - `DATABASE_URL` built from these values.
    - `.env.prod` – configuration for pointing the backend at the production Postgres instance:
      - `DATABASE_HOST=postgres` (or the appropriate host if connecting over VPN/SSH tunnel).
      - `DATABASE_NAME=site_items_tracker_prod`, `DATABASE_USER=site_items_tracker_user`, `DATABASE_PASSWORD=<secure-password>`.
      - `DATABASE_URL` pointing at the shared production Postgres.
  - Document how to run the backend locally against each DB:
    - Local DB: `cp backend/.env.dev backend/.env` then `pnpm dev` / `pnpm start`.
    - Prod DB (for debugging): `cp backend/.env.prod backend/.env` then run the backend in a controlled environment.
  - Ensure the Docker image uses the production-appropriate env file (server-side) via the Swarm stack’s env injection, without exposing secrets in the repo.

- [ ] 7. Scraper configuration for local vs production API targets

  - Extend the scraper configuration to support both local and production API endpoints:
    - In `scraper/.env.example`, add:
      - `API_BASE_URL_LOCAL=http://localhost:<local_backend_port>`.
      - `API_BASE_URL_PROD=http://<server-ip-or-domain>:<api-publish-port>`.
    - Optionally retain a generic `API_BASE_URL` that defaults to the production URL.
  - Update scraper code/config (in a separate implementation task) to allow selecting targets:
    - Support running the scraper against:
      - **prod only** (default for automated/cron-like runs).
      - **local only** (for development).
      - **both prod and local** in a single run when explicitly requested.
    - Use a simple env or CLI flag (e.g. `SCRAPER_TARGET=prod|local|both`) to control this behaviour.
  - Document usage patterns:
    - Examples of running the scraper against each target configuration.
    - Any safety notes about writing to production (e.g. avoid destructive operations; scraper should only append/update price history).

- [ ] 8. Verification, monitoring, and rollback for the backend deployment

  - Define smoke tests for the production backend after each deployment:
    - Verify the Swarm service is updated and healthy (`docker service ls`, `docker service ps items-tracker_api`).
    - Hit the backend health endpoint (e.g. `curl http://<server-ip>:<api-publish-port>/health`).
    - Hit a small set of core endpoints (e.g. `/items`, `/items/{id}`) to confirm DB access and application logic.
  - Document a simple rollback strategy:
    - Re-deploy the previous image tag by invoking the deploy script with the older `sha-<SHORT_SHA>`.
    - If a migration caused issues, restore data from a Postgres backup using `pg_restore` and re-run `prisma migrate deploy` as needed.
  - Capture follow-up work for later phases:
    - Move the backend behind Nginx Proxy Manager with a proper domain and TLS, replacing the raw IP:port URL in configuration.
    - Integrate backend health checks and version info into any existing monitoring/alerting (e.g. uptime checks, log dashboards).
