# Board Game Price Tracker – Phase 2: Enhanced Tracking & Notifications

## Implementation Plan

- [ ] 1. Extend tracking model and API for advanced conditions

  - Update `ProductTracking` schema and DTOs to fully support:
    - `trackType`: `general` | `price_drop` | `back_in_stock` | `price_drop_percent`.
    - `priceThreshold` (absolute value) and `priceDropPercent`.
  - Update NestJS Tracking module:
    - `POST /api/v1/tracking` to accept advanced condition payloads.
    - `GET /api/v1/tracking` to return enriched condition data.
  - Ensure backward compatibility with MVP `general` tracking records.
  - _PRD refs: 3.2.2 Tracking API, 3.3.1 ProductTracking, 4.2 Phase 2_
  - Status: Not started

- [ ] 2. Implement tracking evaluation engine on backend

  - Design a service that evaluates tracking conditions against latest price history data.
  - Define evaluation rules:
    - `price_drop`: current price < previous price by any amount.
    - `price_drop` below threshold: current price <= `priceThreshold`.
    - `price_drop_percent`: relative change vs previous price >= `priceDropPercent`.
    - `back_in_stock`: availability transitions from `false`/`null` to `true`.
  - Implement a periodic BullMQ job (or hook into scraping completion) to:
    - Fetch relevant `ProductTracking` records.
    - Compare current vs previous price/availability.
    - Generate alert events when conditions are met.
  - _PRD refs: 3.2.2 Tracking/Alerts, 3.3.1 PriceHistory & ProductTracking, 4.2 Phase 2_
  - Status: Not started

- [ ] 3. Discord webhook notification integration

  - Read `DISCORD_WEBHOOK_URL` and `ENABLE_DISCORD_NOTIFICATIONS` from env.
  - Implement a `NotificationsService` in Nest that:
    - Accepts alert events and posts a simple message + link payload to the Discord webhook.
    - Handles basic error/retry logic and logs failures.
  - Start with a single global webhook for all alerts (per PRD), no per-user webhooks yet.
  - _PRD refs: 3.2.3 (Notifications env), 4.2 Phase 2, 11.1 Technology Justifications_
  - Status: Not started

- [ ] 4. Frontend UI for advanced tracking conditions

  - Extend tracking UI on `/tracking` and product detail page to allow:
    - Selecting track type: general, price drops below X, back in stock, price drops by %.
    - Entering numeric thresholds where required.
  - Update localStorage structure and syncing logic to store new condition fields alongside backend records.
  - Reflect active conditions in tracked item displays (e.g. badges or text summary).
  - _PRD refs: 3.4.5 Tracking Management, 3.4.6 Local Storage, 4.2 Phase 2_
  - Status: Not started

- [ ] 5. Alerts surface and user visibility (backend + frontend)

  - Implement `GET /api/v1/tracking/alerts` to return items that currently match tracking conditions.
  - Add a basic alerts panel or list on the homepage or tracking page showing recent/active alerts.
  - Ensure alerts reference products and link to product detail pages.
  - Consider simple de-duplication rules to avoid spamming repeated alerts for the same condition.
  - _PRD refs: 3.2.2 Tracking API (alerts), 3.4.2 Homepage Components, 4.2 Phase 2_
  - Status: Not started

- [ ] 6. Testing and validation for enhanced tracking

  - Add backend unit/integration tests for tracking evaluation logic and Discord notifications.
  - Add frontend tests for advanced tracking forms and alert listing components.
  - Include enhanced tracking in E2E smoke scenarios (e.g. simulate price drop, confirm alert appears and notification is sent).
  - _PRD refs: 5.2 Test Types, 4.2 Phase 2, 9.1/9.2 Success Criteria_
  - Status: Not started
