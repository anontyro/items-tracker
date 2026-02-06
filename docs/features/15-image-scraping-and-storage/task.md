# Feature 15: Image Scraping & Storage

This feature adds support for scraping product images from retailer sites, storing them locally in the backend, and serving them via a canonical image endpoint. Images are de‑duplicated across products using `bggId` where available, and missing files are detected lazily and re‑fetched automatically on future scrapes.

## Implementation Plan

1. [ ] **Define backend image model and storage layout**

   - [ ] Add a `GameImage` (name TBD, e.g. `ProductImage`) model to `backend/prisma/schema.prisma`:
     - [ ] `id` (string UUID primary key).
     - [ ] `productId` (string, nullable or required – links to `Product.id`).
     - [ ] `bggId` (string, nullable) to support canonical images per BGG game.
     - [ ] `sourceName` (string) and/or `sourceId` (optional FK to `ProductSource`) to indicate which retailer provided the image.
     - [ ] `remoteImageUrl` (string) – the original URL scraped from the retailer / source site.
     - [ ] `localPath` (string) – relative path under the backend’s public folder (e.g. `images/games/<key>/<imageId>.jpg`).
     - [ ] `status` (string enum) – e.g. `"active" | "missing" | "deleted"`.
     - [ ] `createdAt` / `updatedAt` timestamps.
     - [ ] Optional `lastCheckedAt` timestamp for when the file presence was last verified.
   - [ ] Model relations:
     - [ ] `product` relation to `Product` (where a product has its own provisional image before a `bggId` exists).
     - [ ] No hard relation to `BggGame` (use plain `bggId` string for flexibility and to avoid coupling).
   - [ ] Indices and uniqueness rules (enforced in code rather than strict DB constraints for simplicity):
     - [ ] Index on `(bggId)` for fast lookup of canonical image by BGG ID.
     - [ ] Index on `(productId)` to support products without BGG mapping.
     - [ ] Application logic ensures **at most one primary active image per BGG game** and per product without `bggId`.
   - [ ] Define filesystem layout under the backend project, e.g.:
     - [ ] Root: `backend/public/images/games/`.
     - [ ] Folder per canonical key: `backend/public/images/games/<canonicalKey>/`, where `canonicalKey` is:
       - [ ] Prefer `bggId` when present (e.g. `bgg-13`).
       - [ ] Otherwise, fallback to `productId` (e.g. `prod-<uuid>`).
     - [ ] File name per image: `<imageId>.<ext>` (typically `.jpg` or `.png`).
     - [ ] `localPath` stored in DB as `images/games/<canonicalKey>/<imageId>.<ext>` to keep URL construction simple.
   - [ ] Ensure NestJS is configured to serve static files from `backend/public` (if not already):
     - [ ] Use `ServeStaticModule` or equivalent to expose `/images/*` under `/`.

2. [ ] **Add backend image service and canonical selection logic**

   - [ ] Create a dedicated service (e.g. `ImageService`) responsible for:
     - [ ] Looking up the **canonical image** for a product:
       - [ ] Load `Product` by `id`.
       - [ ] If `product.bggId` is set, prefer a `GameImage` where `bggId = product.bggId` and `status = 'active'`.
       - [ ] Otherwise, look for a `GameImage` where `productId = product.id` and `status = 'active'`.
       - [ ] If multiple candidates exist, apply a tie‑break rule (e.g. prefer images from a preferred `sourceName` or the most recently updated one).
     - [ ] Creating/updating image records when a new scraped image is provided:
       - [ ] If a canonical `GameImage` already exists for the resolved key (`bggId` or `productId`), update its `remoteImageUrl`, `localPath`, and `status` when a new image is successfully downloaded.
       - [ ] If none exists, create a new record linked to the product and/or `bggId`.
     - [ ] Marking images as `missing` when the file is not found on disk.
     - [ ] Optionally recording `lastCheckedAt` on file existence checks.
   - [ ] Implement helper methods:
     - [ ] `getCanonicalImageForProduct(productId: string)`.
     - [ ] `markImageMissing(imageId: string)`.
     - [ ] `upsertImageFromScrape(input)` which:
       - [ ] Resolves canonical key (`bggId` if present on `Product`, else `productId`).
       - [ ] Writes the downloaded image file to the correct folder.
       - [ ] Upserts the corresponding `GameImage` record.

3. [ ] **Implement backend image download and scraper‑facing ingest endpoint (Option B)**

   - [ ] Follow the agreed approach where the **backend pulls images from the remote URL** instead of the scraper uploading bytes.
   - [ ] Add a new **scraper‑protected** endpoint under `/v1` (exact naming TBD, for example):
     - [ ] `POST /v1/images/from-scrape`
       - [ ] Protected by `SCRAPER_API_KEY` via `x-api-key` header.
       - [ ] Request body (example):
         - [ ] `productId` (backend product ID).
         - [ ] Optional `bggId` if known at scrape time (usually `null` for now; we will rely on `Product.bggId` once linked).
         - [ ] `sourceName` or `sourceId` to record which retailer this came from.
         - [ ] `remoteImageUrl` (string) – image URL scraped from the retailer.
       - [ ] Behaviour:
         - [ ] Resolve the product and its `bggId`.
         - [ ] Compute canonical key: `bggId` if present else `productId`.
         - [ ] Attempt to download the image from `remoteImageUrl` (with timeout and basic validation).
         - [ ] On success:
           - [ ] Save the file to `backend/public/images/games/<canonicalKey>/<imageId>.<ext>`.
           - [ ] Call `ImageService.upsertImageFromScrape(...)` to persist/update the DB record.
         - [ ] On failure:
           - [ ] Log a concise error, **do not fail the scrape run as a whole**.
           - [ ] Optionally leave/mark any existing image record as `missing` or unchanged.
   - [ ] For v1, **do not** add an offline outbox for image ingestion; instead, rely on the fact that images can be fetched again later (rescrape flow) if this call fails.

4. [ ] **Extend scraper to extract product detail URL and image URL**

   - [ ] Extend the scraper’s site configuration for image scraping:
     - [ ] In `scraper/config/sites/*.json`, add selectors for:
       - [ ] `productLinkSelector` – to get the product detail page URL from the list HTML (`<a class="zg-product-image" href="...">`).
       - [ ] `listImageSelector` (optional) – to read the list page image `src` as a fallback.
     - [ ] Optionally add a flag `followProductPageForImage: true` to indicate we should navigate into the detail page for a better image.
   - [ ] Update `scrapeSiteWithPlaywright` in `scraper/src/scraper/boardGameScraper.ts` to:
     - [ ] Extract the product detail URL per item from the list.
     - [ ] Navigate to the detail page when `followProductPageForImage` is true, and extract a higher‑quality image URL using a configured selector (e.g. main product image).
     - [ ] Fall back to the list image URL if a better one cannot be found.
   - [ ] Extend the `RawScrapedProductRow` type and normalization pipeline to include image metadata:
     - [ ] Add fields like `productPageUrl` and `imageUrl` to `RawScrapedProductRow`.
     - [ ] Ensure these fields are persisted into SQLite via `saveScrapedProducts` so they are available for debugging.
     - [ ] In `normalizeRowsForSite`, expose enough information (e.g. mapping from normalized product to its `imageUrl` + `productPageUrl`) so the scraper can call the backend image ingest endpoint for relevant products.
   - [ ] On each scrape run, after or alongside price history ingestion:
     - [ ] For each normalized product row (or at least those without an active local image), call the backend `/v1/images/from-scrape` endpoint with:
       - [ ] `productId` returned from the price ingest flow (or via a lookup if needed).
       - [ ] Source identifier and `remoteImageUrl`.
     - [ ] Keep this best‑effort (log failures, but do not block the run).

5. [ ] **Lazy missing‑file detection and automatic refill on future scrapes**

   - [ ] In the backend image service / controller, **check file existence** whenever an image is requested or resolved:
     - [ ] If `GameImage.localPath` is set but the file is not present on disk:
       - [ ] Update the record: `status = 'missing'` and set `lastCheckedAt = now()`.
       - [ ] Optionally clear `localPath` or leave it unchanged for debugging.
     - [ ] For the current request, treat this as if there were no local image (fall back behaviour, see below).
   - [ ] Automatic refill on future scrapes:
     - [ ] When the scraper next runs and calls `/v1/images/from-scrape` for the same game:
       - [ ] The backend will see an existing `GameImage` marked `missing` or no active image.
       - [ ] It will attempt to download and overwrite / recreate the file, then set `status = 'active'` again.
   - [ ] When an image is missing and a new scrape has not happened yet:
     - [ ] If a **canonical alternative** exists (e.g. another site’s image for the same `bggId` or a manually uploaded admin image in the future), the selection logic should:
       - [ ] Prefer that alternative canonical image.
       - [ ] Only fall back to retailer‑specific or placeholder images when none exist.

6. [ ] **Add public image endpoint for frontend consumption**

   - [ ] Implement `GET /v1/games/:id/image` (or `products` if you prefer to keep naming consistent) on the backend:
     - [ ] Path parameter: `:id` is the backend `Product.id`.
     - [ ] Behaviour:
       - [ ] Use `ImageService.getCanonicalImageForProduct(id)` to resolve the best image record.
       - [ ] If a `GameImage` is found:
         - [ ] Check file existence; if missing, mark it `missing` and treat as not found (see above).
         - [ ] If file exists:
           - [ ] Respond with either:
             - [ ] A redirect (e.g. 302) to `/images/games/...` based on `localPath`, **or**
             - [ ] A streamed file response that serves the image bytes directly.
       - [ ] If no usable image exists:
         - [ ] Return a 404 or a small JSON/empty response that allows the frontend to fall back to its current avatar placeholder.
     - [ ] Protect this endpoint with the same `FRONTEND_API_KEY` mechanism as other frontend APIs.

7. [ ] **Wire frontend list view to use game images (with graceful fallback)**

   - [ ] Update the frontend item / list components to use the new image endpoint:
     - [ ] For each product item in the list, trigger a fetch to `/v1/games/:id/image` (or construct a direct URL if we expose images as static paths under a predictable pattern).
     - [ ] If the request succeeds, render the returned image.
     - [ ] If it fails (404 or network error), keep the current avatar/placeholder behaviour.
   - [ ] Keep frontend changes minimal for this feature:
     - [ ] Only list views need to use images for now.
     - [ ] Product detail pages and richer galleries can be added in future features.

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
  - The scraper should navigate to the product page to capture the higher‑quality image when feasible, falling back to list images only when necessary.
- Future extensions (out of scope for this feature, but influenced by this design):
  - Support multiple images per game (front, back, alt art) with a `isPrimary` flag.
  - Add an admin UI to manually upload or override images and to manage edge cases.
  - Introduce an offline/outbox mechanism for image ingestion similar to price history, if image ingestion needs the same durability guarantees.
  - Prefer canonical sources like BoardGameGeek images when integrating them later; retailer images then become a fallback.
