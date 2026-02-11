# Feature 15: Image Scraping & Storage

This feature adds support for scraping product images from retailer sites, storing them locally in the backend, and serving them via a canonical image endpoint. Images are de‑duplicated across products using `bggId` where available, and missing files are detected lazily and re‑fetched automatically on future scrapes.

## Implementation Plan

1. [x] **Define backend image model and storage layout**
   - [x] Add a `GameImage` (name TBD, e.g. `ProductImage`) model to `backend/prisma/schema.prisma`:
     - [x] `id` (string UUID primary key).
     - [x] `productId` (string, nullable or required – links to `Product.id`).
     - [x] `bggId` (string, nullable) to support canonical images per BGG game.
     - [x] `sourceName` (string) and/or `sourceId` (optional FK to `ProductSource`) to indicate which retailer provided the image.
     - [x] `remoteImageUrl` (string) – the original URL scraped from the retailer / source site.
     - [x] `localPath` (string) – relative path under the backend’s public folder (e.g. `images/games/<key>/<imageId>.jpg`).
     - [x] `status` (string enum) – e.g. `"active" | "missing" | "deleted"`.
     - [x] `createdAt` / `updatedAt` timestamps.
     - [x] Optional `lastCheckedAt` timestamp for when the file presence was last verified.
   - [x] Model relations:
     - [x] `product` relation to `Product` (where a product has its own provisional image before a `bggId` exists).
     - [x] No hard relation to `BggGame` (use plain `bggId` string for flexibility and to avoid coupling).
   - [x] Indices and uniqueness rules (enforced in code rather than strict DB constraints for simplicity):
     - [x] Index on `(bggId)` for fast lookup of canonical image by BGG ID.
     - [x] Index on `(productId)` to support products without BGG mapping.
     - [x] Application logic ensures **at most one primary active image per BGG game** and per product without `bggId`.
   - [x] Define filesystem layout under the backend project, e.g.:
     - [x] Root: `backend/public/images/games/`.
     - [x] Folder per canonical key: `backend/public/images/games/<canonicalKey>/`, where `canonicalKey` is:
       - [x] Prefer `bggId` when present (e.g. `bgg-13`).
       - [x] Otherwise, fallback to `productId` (e.g. `prod-<uuid>`).
     - [x] File name per image: `<imageId>.<ext>` (typically `.jpg` or `.png`).
     - [x] `localPath` stored in DB as `images/games/<canonicalKey>/<imageId>.<ext>` to keep URL construction simple.
   - [ ] Ensure NestJS is configured to serve static files from `backend/public` (if not already):
     - [ ] Use `ServeStaticModule` or equivalent to expose `/images/*` under `/`.

2. [x] **Add backend image service and canonical selection logic**
   - [x] Create a dedicated service (e.g. `ImageService`) responsible for:
     - [x] Looking up the **canonical image** for a product:
       - [x] Load `Product` by `id`.
       - [x] If `product.bggId` is set, prefer a `GameImage` where `bggId = product.bggId` and `status = 'active'`.
       - [x] Otherwise, look for a `GameImage` where `productId = product.id` and `status = 'active'`.
       - [x] If multiple candidates exist, apply a tie‑break rule (e.g. prefer images from a preferred `sourceName` or the most recently updated one).
     - [x] Creating/updating image records when a new scraped image is provided:
       - [x] If a canonical `GameImage` already exists for the resolved key (`bggId` or `productId`), update its `remoteImageUrl`, `localPath`, and `status` when a new image is successfully downloaded.
       - [x] If none exists, create a new record linked to the product and/or `bggId`.
     - [x] Marking images as `missing` when the file is not found on disk.
     - [x] Optionally recording `lastCheckedAt` on file existence checks.
   - [x] Implement helper methods:
     - [x] `getCanonicalImageForProduct(productId: string)`.
     - [x] `markImageMissing(imageId: string)`.
     - [x] `upsertImageFromScrape(input)` which:
       - [x] Resolves canonical key (`bggId` if present on `Product`, else `productId`).
       - [x] Writes the downloaded image file to the correct folder.
       - [x] Upserts the corresponding `GameImage` record.

3. [x] **Implement backend image download and scraper‑facing ingest endpoint (Option B)**
   - [x] Follow the agreed approach where the **backend pulls images from the remote URL** instead of the scraper uploading bytes.
   - [x] Add a new **scraper‑protected** endpoint under `/v1`:
     - [x] `POST /v1/images/from-scrape`
       - [x] Protected by `SCRAPER_API_KEY` via `x-api-key` header.
       - [x] Request body (current implementation):
         - [x] `sourceUrl` (string) – product `sourceUrl` from the retailer, used to resolve `ProductSource` and `Product`.
         - [x] `remoteImageUrl` (string) – image URL scraped from the retailer.
       - [x] Behaviour:
         - [x] Resolve the product and its `bggId`.
         - [x] Compute canonical key: `bggId` if present else `productId`.
         - [x] Attempt to download the image from `remoteImageUrl` (with timeout and basic validation).
         - [x] On success:
           - [x] Save the file to `backend/public/images/games/<canonicalKey>/<imageId>.<ext>`.
           - [x] Call `ImageService.upsertImageFromScrape(...)` to persist/update the DB record.
         - [x] On failure:

4. [x] **Extend scraper to extract product detail URL and image URL**
   - [x] Extend the scraper’s site configuration for image scraping:
     - [x] In `scraper/config/sites/*.json`, add selectors for:
       - [x] `productImageList` – CSS selector to read the list page image `src`/`data-src` as a fallback.
       - [x] `productImageDetail` – CSS selector used on the product detail page for a higher‑quality image.
     - [x] Add a flag `followProductPageForImage: true` to indicate we should navigate into the detail page for a better image when desired.
   - [x] Update `scrapeSiteWithPlaywright` in `scraper/src/scraper/boardGameScraper.ts` to:
     - [x] Use the existing product detail URL per item from the list (`url` field).
     - [x] Extract a list‑page image URL when `productImageList` is configured.
     - [x] Optionally navigate to the detail page when `followProductPageForImage` is true and extract a higher‑quality image URL using `productImageDetail`.
     - [x] Fall back to the list image URL if a better one cannot be found.
   - [x] Extend the normalization pipeline to include image metadata:
     - [x] Store `imageUrl` inside `raw_json` for each scraped row.
     - [x] In `normalizeRowsForSite`, parse `raw_json` to recover `imageUrl` and include it in `source.additionalData` alongside `productPageUrl`.
   - [x] On each scrape run, after price history ingestion:
     - [x] For each normalized product row that has an `imageUrl`, call the backend `/v1/images/from-scrape` endpoint with:
       - [x] `sourceUrl` (from the normalized source) and `remoteImageUrl` (`imageUrl`).
     - [x] Keep this best‑effort (loggable failures, but do not block the run).

5. [x] **Lazy missing‑file detection and automatic refill on future scrapes**
   - [x] In the backend image service / controller, **check file existence** whenever an image is requested or resolved:
     - [x] If `GameImage.localPath` is set but the file is not present on disk:
       - [x] Update the record: `status = 'missing'` and set `lastCheckedAt = now()`.
       - [x] Optionally clear `localPath` or leave it unchanged for debugging.
     - [x] For the current request, treat this as if there were no local image (fall back behaviour, see below).
   - [x] Automatic refill on future scrapes:
     - [x] When the scraper next runs and calls `/v1/images/from-scrape` for the same game:
       - [x] The backend will see an existing `GameImage` marked `missing` or no active image.
       - [x] It will attempt to download and overwrite / recreate the file, then set `status = 'active'` again.
   - [x] When an image is missing and a new scrape has not happened yet:
     - [x] If a **canonical alternative** exists (e.g. another site’s image for the same `bggId` or a manually uploaded admin image in the future), the selection logic should:
       - [x] Prefer that alternative canonical image.
       - [x] Only fall back to retailer‑specific or placeholder images when none exist.

6. [x] **Add public image endpoint for frontend consumption**
   - [x] Implement `GET /v1/games/:id/image` (or `products` if you prefer to keep naming consistent) on the backend:
     - [x] Path parameter: `:id` is the backend `Product.id`.
     - [x] Behaviour:
       - [x] Use `ImageService.getCanonicalImageForProduct(id)` to resolve the best image record.
       - [x] If a `GameImage` is found:
         - [x] Check file existence; if missing, mark it `missing` and treat as not found (see above).
         - [x] If file exists:
           - [x] Respond with either:
             - [x] A redirect (e.g. 302) to `/images/games/...` based on `localPath`, **or**
             - [x] A streamed file response that serves the image bytes directly.
       - [x] If no usable image exists:
         - [x] Return a 404 or a small JSON/empty response that allows the frontend to fall back to its current avatar placeholder.
     - [x] Protect this endpoint with the same `FRONTEND_API_KEY` mechanism as other frontend APIs.

7. [x] **Wire frontend list view to use game images (with graceful fallback)**
   - [x] Update the frontend item / list components to use the new image endpoint:
     - [x] For each product item in the list, trigger a fetch to `/v1/games/:id/image` (or construct a direct URL if we expose images as static paths under a predictable pattern).
     - [x] If the request succeeds, render the returned image.
     - [x] If it fails (404 or network error), keep the current avatar/placeholder behaviour.
   - [x] Keep frontend changes minimal for this feature:
     - [x] Only list views need to use images for now.
     - [x] Product detail pages and richer galleries can be added in future features.

8. [ ] **Testing & verification**
   - [ ] Backend:
     - [ ] Unit tests for `ImageService` canonical selection:
       - [ ] Product with `bggId` and existing canonical image.
       - [ ] Product without `bggId` but with a product‑specific image.
       - [ ] Multiple images from different sources where tie‑break rules apply.
     - [ ] Tests (or manual checks) for the `/v1/images/from-scrape` endpoint:
       - [ ] Successful download and save.
       - [ ] Failure cases (invalid URL, timeout) and logging.
     - [ ] Tests for lazy missing detection on `GET /v1/games/:id/image`.
   - [ ] Scraper:
     - [ ] Integration tests / manual runs against a sample HTML (like the Zatu snippet) to confirm:
       - [ ] List page selectors correctly find product detail URLs.
       - [ ] Detail page scraping finds the higher‑quality image.
       - [ ] Backend image ingest calls are made with the expected payload.
   - [ ] Frontend:
     - [ ] Verify that lists show images when available and fall back to avatar when not.

---

## Dependencies / Notes

- This feature depends on:
  - Existing `Product`, `ProductSource`, and `BggGame` models in `backend/prisma/schema.prisma`.
  - The scraper’s Playwright‑based scraping flow and site configs already in place.
  - The existing price history ingestion flow (`/v1/price-history/batch`) for mapping scraped items to backend `Product` records.
- Canonical identity rules:
  - When a `Product` has a `bggId`, that BGG ID becomes the canonical key for images.
  - All products sharing the same `bggId` should re‑use the same primary image, to avoid duplicate downloads and inconsistent visuals across retailers.
  - When a product has **no** `bggId`, images are initially associated with that `productId` only. When `bggId` is later set (via Feature 12’s enrichment), future work can migrate/unify images by that `bggId`.
- Missing file behaviour:
  - Detection is **lazy**: when an image is requested and the file is not found, the DB is updated to mark the image as `missing`.
  - Future scrapes that see the same game (via the normal scraping cadence) will naturally attempt to refetch and restore the image via `/v1/images/from-scrape`.
- Image quality:
  - For now, we store a **single size** per game, preferring the best available image from the product detail page.
  - The scraper can optionally navigate to the product page (controlled by `SCRAPER_ENABLE_DETAIL_IMAGES`) to capture a higher‑quality image when feasible, falling back to list images only when necessary.
- Future extensions (out of scope for this feature, but influenced by this design):
  - Support multiple images per game (front, back, alt art) with a `isPrimary` flag.
  - Add an admin UI to manually upload or override images and to manage edge cases.
  - Introduce an offline/outbox mechanism for image ingestion similar to price history, if image ingestion needs the same durability guarantees.
  - Prefer canonical sources like BoardGameGeek images when integrating them later; retailer images then become a fallback.
