# Board Game Price Tracker – Phase 7: Deployment & CI/CD

## Implementation Plan

- [ ] 1. Define environments and deployment targets

  - Decide on target environments (e.g. staging, production) and their URLs.
  - Confirm production runtime environment (Docker Swarm cluster or alternative).
  - Document required infrastructure: nodes, load balancer, volumes, secrets management.
  - _PRD refs: 2.4 Infrastructure, 6.2 Production Deployment, 7.2 Data Flow_
  - Status: Not started

- [ ] 2. Docker image build pipeline

  - Ensure each service (frontend, backend, scraper) has a production-ready Dockerfile.
  - Optimise images for size and build time (multi-stage builds, dependency caching).
  - Define image naming/versioning scheme (e.g. `app-frontend:git-sha`).
  - _PRD refs: 2.4 Containerization, 6.2 CI/CD Pipeline_
  - Status: Not started

- [ ] 3. GitHub Actions CI workflow

  - Create or update a GitHub Actions workflow to:
    - Trigger on push/PR to main and relevant branches.
    - Run linting, type checking, and all Jest test suites.
    - Build Docker images for frontend, backend, scraper.
    - Push images to Docker Hub (or chosen registry).
  - Configure secrets in GitHub for registry credentials and environment variables.
  - _PRD refs: 6.2 CI/CD Pipeline, 11.2 Key Dependencies_
  - Status: Not started

- [ ] 4. Docker Swarm (or alternative) deployment configuration

  - Create deployment manifests (e.g. Docker Stack file) specifying:
    - Service replicas, resource limits, networks.
    - Environment variables and secrets injection.
    - Volumes for Postgres data.
  - Define deployment commands or automated steps executed from CI.
  - _PRD refs: 2.4 Infrastructure, 6.2–6.3, 7.2, 8.2 Scalability_
  - Status: Not started

- [ ] 5. Post-deploy smoke tests and monitoring

  - Implement automated smoke tests that run after deploy:
    - Hit key health endpoints (backend, scraper, DB connectivity).
    - Verify a basic frontend flow (home → search → product detail).
  - Integrate basic monitoring/alerting (e.g. via external uptime monitor or logs) to detect outages.
  - _PRD refs: 6.2 CI/CD Pipeline (smoke tests), 8.3 Reliability, 9.1 Success Criteria_
  - Status: Not started

- [ ] 6. Deployment runbooks and rollback strategy

  - Document deployment procedures for staging and production.
  - Define rollback steps (e.g. roll back to previous image tag, restore DB from backup if required).
  - Capture known failure modes and quick checks (logs, health endpoints, DB connectivity).
  - _PRD refs: 6.2 Production Deployment, 8.3 Reliability_
  - Status: Not started
