# Board Game Price Tracker – Phase 5: Authentication & Multi-User Support

## Implementation Plan

- [ ] 1. Introduce authentication (NextAuth) on the frontend

  - Integrate NextAuth (or chosen auth solution) into the Next.js app.
  - Configure at least one provider (e.g. Google OAuth) as per PRD.
  - Implement login/logout UI and a minimal account/profile section.
  - Ensure session state is accessible in relevant pages and API calls.
  - _PRD refs: 4.2 Phase 5, 11.1 Technology Justifications_
  - Status: Not started

- [ ] 2. User model and linking to tracking/wishlists

  - Introduce a `User` model (if not already present) and link:
    - `ProductTracking.userId`.
    - `Wishlist.userId`.
  - Plan and implement a migration strategy from MVP state:
    - Existing records with `userId = null` mapped to new authenticated users where possible.
    - Define behaviour for anonymous data when a user signs in for the first time.
  - _PRD refs: 3.3.1 ProductTracking/Wishlist, 4.2 Phase 5_
  - Status: Not started

- [ ] 3. API protection and per-user data scoping

  - Update backend endpoints to require authentication where appropriate (tracking, wishlists, alerts).
  - Scope queries to the authenticated user:
    - Only return tracking and wishlists for the current user.
    - Ensure no cross-user data leaks.
  - Implement basic authorization guards/middleware in Nest (e.g. JWT or session validation).
  - _PRD refs: 3.2.2 Tracking/Wishlist APIs, 8.4 Security, 4.2 Phase 5_
  - Status: Not started

- [ ] 4. Frontend user experience for multi-user data

  - Update frontend data fetching hooks to include auth context (tokens/cookies) when calling protected endpoints.
  - Ensure that user-specific data (tracking, wishlists, preferences) is consistent across devices once logged in.
  - Define how to handle pre-auth localStorage data when a user logs in (migration or merge behaviour).
  - _PRD refs: 3.4.6 Local Storage, 4.2 Phase 5_
  - Status: Not started

- [ ] 5. Per-user Discord/webhook notifications (future extension)

  - Extend notification configuration model to allow users to optionally specify their own Discord webhook.
  - Provide a simple UI in user settings to store/update a personal webhook URL.
  - Adjust notification sending logic to prioritise per-user webhooks over global ones when available.
  - _PRD refs: 4.2 Phase 5 (per-user webhooks), 4.2 Phase 2 (global webhook)_
  - Status: Not started

- [ ] 6. Testing and security review for authentication

  - Add tests for auth guards and per-user data scoping.
  - Add frontend tests around login/logout flows and access to protected pages.
  - Perform a basic security review: session handling, CSRF/XSS considerations, secure cookie settings.
  - _PRD refs: 5.2 Testing, 8.4 Security, 4.2 Phase 5_
  - Status: Not started
