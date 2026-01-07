# Frontend API Routes

This document describes the **frontend-facing API routes** exposed by the Next.js app under `app/api`. These routes proxy to the NestJS backend and handle authentication using the `FRONTEND_API_KEY` environment variable.

All examples assume:

- Next.js dev server at `http://localhost:3000`
- Backend server at `BACKEND_API_URL` (e.g. `http://localhost:3005`)
- `FRONTEND_API_KEY` is configured in both frontend and backend and matches

Environment variables (frontend):

- `BACKEND_API_URL` – base URL for the NestJS backend (e.g. `http://localhost:3005`)
- `FRONTEND_API_KEY` – API key that the frontend uses to call the backend

---

## Route: GET `/api/products`

- **Description**

  - Search and paginate products.
  - Proxies to backend `GET /v1/products` with header `x-api-key: FRONTEND_API_KEY`.

- **Query parameters**

  - **`q`** (optional, string)
    - Free-text search term. Empty string or absent will return all products.
  - **`limit`** (optional, number, default `50`)
    - Maximum number of items to return.
  - **`offset`** (optional, number, default `0`)
    - Zero-based offset for pagination.

- **Sample request**

```bash
curl "http://localhost:3000/api/products?q=catan&limit=20&offset=0"
```

- **Sample response body** (`200 OK`)

```json
{
  "items": [
    {
      "id": "prod_123",
      "name": "Catan",
      "type": "board_game"
    },
    {
      "id": "prod_124",
      "name": "Catan: Seafarers",
      "type": "expansion"
    }
  ],
  "total": 2
}
```

- **Error responses**
  - `401 Unauthorized` – if the backend rejects the `x-api-key`.
  - `500 Internal Server Error` – on unexpected backend or proxy failure.

---

## Route: GET `/api/products/:id`

- **Description**

  - Fetch detailed information for a single product by ID.
  - Proxies to backend `GET /v1/products/:id` with header `x-api-key: FRONTEND_API_KEY`.

- **Path parameters**

  - **`id`** (string)
    - Product ID as stored in the database.

- **Sample request**

```bash
curl "http://localhost:3000/api/products/prod_123"
```

- **Sample response body** (`200 OK`)

```json
{
  "id": "prod_123",
  "name": "Catan",
  "type": "board_game",
  "bggId": "13",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-02T08:30:00.000Z",
  "sources": [
    {
      "id": "src_1",
      "sourceName": "Store A",
      "sourceUrl": "https://store-a.example.com/catan",
      "sku": "CATAN-BASE"
    },
    {
      "id": "src_2",
      "sourceName": "Store B",
      "sourceUrl": "https://store-b.example.com/catan",
      "sku": null
    }
  ]
}
```

- **Error responses**
  - `404 Not Found` – if no product exists with the given `id`.
  - `401 Unauthorized` – if the backend rejects the `x-api-key`.
  - `500 Internal Server Error` – on unexpected backend or proxy failure.

---

## Route: GET `/api/products/:id/history`

- **Description**

  - Fetch recent price history points for a given product.
  - Proxies to backend `GET /v1/products/:id/history` with header `x-api-key: FRONTEND_API_KEY`.

- **Path parameters**

  - **`id`** (string)
    - Product ID whose history will be returned.

- **Query parameters**

  - **`limit`** (optional, number, default `365`)
    - Maximum number of history points to return.

- **Sample request**

```bash
curl "http://localhost:3000/api/products/prod_123/history?limit=10"
```

- **Sample response body** (`200 OK`)

```json
{
  "items": [
    {
      "id": "hist_1",
      "productId": "prod_123",
      "sourceId": "src_1",
      "price": "39.99",
      "rrp": "49.99",
      "availability": true,
      "scrapedAt": "2025-01-10T09:00:00.000Z"
    },
    {
      "id": "hist_2",
      "productId": "prod_123",
      "sourceId": "src_2",
      "price": "37.50",
      "rrp": null,
      "availability": true,
      "scrapedAt": "2025-01-09T09:00:00.000Z"
    }
  ]
}
```

- **Error responses**
  - `404 Not Found` – if the product does not exist.
  - `401 Unauthorized` – if the backend rejects the `x-api-key`.
  - `500 Internal Server Error` – on unexpected backend or proxy failure.

---

## Backend mappings summary

- **`GET /api/products`**

  - Proxies to **`GET /v1/products`**
  - Forwards query params: `q`, `limit`, `offset`
  - Adds header: `x-api-key: FRONTEND_API_KEY`

- **`GET /api/products/:id`**

  - Proxies to **`GET /v1/products/:id`**
  - Adds header: `x-api-key: FRONTEND_API_KEY`

- **`GET /api/products/:id/history`**
  - Proxies to **`GET /v1/products/:id/history`**
  - Forwards query param: `limit`
  - Adds header: `x-api-key: FRONTEND_API_KEY`

These routes are consumed in the frontend via typed helper functions in `lib/api/products.ts` and React Query hooks in `lib/hooks`.
