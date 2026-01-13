# Feature 12: BoardGameGeek (BGG) Populating & Enrichment

This feature adds support for importing BoardGameGeek CSV dumps into the backend database and linking them to existing `Product` records via the optional `bggId` field, enabling canonical game identity across sites.

## Implementation Plan

1. [x] **Define BGG reference model in Prisma schema**

   - [x] Add a `BggGame` model to `backend/prisma/schema.prisma` to store BGG catalog entries.
   - [x] Include key fields from the CSV dump (e.g. `bggId`, `primaryName`, `name`, `yearPublished`, `rank`, `bayesAverage`, `average`, `usersRated`, flags, basic metadata).
   - [x] Add indexes on `primaryName` and `name` to support efficient lookup.
   - [x] Run `prisma migrate dev` to apply the new model to the database.

2. [x] **Implement BGG CSV import script (reference table only)**

   - [x] Create a backend script/CLI (e.g. `src/tools/importBggCsv.ts`) that:
     - [x] Accepts a path to the BGG CSV dump as a command-line argument.
     - [x] Streams/parses the CSV (to handle large files safely).
     - [x] Maps CSV columns to the `BggGame` fields.
     - [x] Upserts rows by `bggId` (create if new, update if existing) so the catalog can be refreshed from newer dumps.
   - [x] Add a package script (e.g. `bgg:import`) to `backend/package.json` to run this tool.
   - [x] Log summary stats (rows seen vs imported) at the end.

3. [x] **Add optional freshness tracking for BGG catalog**

   - [x] Extend `BggGame` with timestamps such as `createdAt`, `updatedAt`, and optional `lastSeenAt`.
   - [x] Update import logic so each run:
     - [x] Sets/updates `lastSeenAt` for all rows seen in the current CSV.
     - [ ] Optionally flags rows not seen for a long time (without deleting) so they can be considered stale later.

4. [x] **Implement Product↔BGG auto-linking script**

   - [x] Create a second backend script/CLI (e.g. `src/tools/linkProductsToBgg.ts`) that:
     - [x] Fetches all `Product` rows where `bggId IS NULL`.
     - [x] For each product, searches `BggGame` using a reasonable heuristic (e.g. case-insensitive exact match of `Product.name` to `BggGame.primaryName` or `name`).
     - [x] If a single confident match is found, sets `product.bggId` to that `BggGame.bggId`.
   - [x] Support a **dry-run mode** that logs proposed matches without writing to the DB.
   - [x] Add a package script (e.g. `bgg:link-products`) in `backend/package.json`.
   - [x] Log summary stats (products scanned, matched, updated, ambiguous, unmatched).

5. [x] **Handle ambiguous or low-confidence matches safely**

   - [x] Define conservative matching rules (e.g. only auto-link on exact or near-exact names, optional filters like `yearPublished` when/if available).
   - [x] Avoid linking when multiple plausible `BggGame` matches exist; record these cases for manual review (e.g. as log output).
   - [x] Ensure the script never overwrites an existing `product.bggId` that has already been set (either manually or by a previous confirmed run).

6. [ ] **Expose backend helper API endpoints for future UI integration (optional)**

   - [ ] Add an internal/admin-only endpoint to:
     - [ ] Search `BggGame` by name query (for manual selection of a BGG entry for a product).
     - [ ] Retrieve BGG details for a given `bggId` linked to a product.
   - [ ] Keep this separate from the public API surface; protect with the basic admin mechanism (see Feature 13).

7. [ ] **Testing & verification**
   - [ ] Add unit tests for CSV parsing and mapping logic (using small sample CSVs).
   - [ ] Add integration tests (or a manual script) that:
     - [ ] Imports a small BGG CSV sample into `BggGame`.
     - [ ] Runs the linking script against a known set of `Product` rows.
     - [ ] Verifies that `bggId` is set correctly and that ambiguous cases are left unchanged.
   - [ ] Verify performance on a realistic-sized CSV dump (run time, memory usage) and adjust streaming/batch sizes if needed.

---

**Dependencies / Notes:**

- This feature is intentionally independent from the scraper and admin UI. It operates entirely in the backend and can be run manually via scripts.
- The new `BggGame` table is a read-mostly reference catalog; `Product` remains the canonical game entity used by the rest of the system.
- Admin tools (see Feature 13) can later consume `BggGame` to assist humans in resolving ambiguous matches or manually setting `bggId`.
