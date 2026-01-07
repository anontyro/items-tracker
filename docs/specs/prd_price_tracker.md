# Product Requirements Document: Board Game Price Tracker

## Document Information

- **Version**: 1.0 (MVP)
- **Created**: January 6, 2026
- **Target Completion**: Prototype/MVP

---

## 1. Executive Summary

### 1.1 Product Vision

A comprehensive price and availability tracking system for board games that enables users to monitor historical pricing data, track inventory fluctuations, and receive notifications when items meet specified criteria. The system will scrape e-commerce sites regularly, store historical data, and provide rich visualizations of price trends over time.

### 1.2 Target Users

- Primary: The product owner and board game enthusiasts
- Secondary: Anyone interested in tracking product pricing and availability across e-commerce sites

### 1.3 Core Problem Statement

Prices and availability of board games fluctuate significantly in the current market. Users lack visibility into historical pricing data and availability patterns, making it difficult to:

- Determine optimal purchase timing
- Understand when items will be restocked
- Identify genuine deals versus normal price variations
- Track multiple items across different retailers

### 1.4 Success Metrics

- Successful daily scraping of target site with <5% failure rate
- Complete historical price data visualization
- User ability to track items and receive notifications
- System uptime >95%

---

## 2. Technical Architecture

### 2.1 Technology Stack

#### Frontend

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS (implied from modern Next.js stack)
- **State Management**: React hooks + localStorage (MVP), expandable to server state management
- **Charts**: Recharts (robust, widely-used, React-native)
- **Sparklines**: Recharts mini charts

#### Backend

- **Framework**: NestJS
- **Language**: TypeScript
- **API Version**: `/api/v1/*`
- **ORM**: Prisma
- **Queue System**: BullMQ (with Redis)

#### Scraper Service

- **Framework**: Separate microservice (Node.js/TypeScript)
- **Scraping**: Playwright
- **Scheduling**: Cron jobs + BullMQ queues
- **Trigger**: Manual endpoint + scheduled tasks

#### Databases

- **Development**: SQLite (local development)
- **Production**: PostgreSQL
- **Cache/Queue**: Redis (for BullMQ)

#### Infrastructure

- **Containerization**: Docker + Docker Compose
- **Development**: Local Docker Compose setup
- **Production**: Docker Swarm (future)
- **CI/CD**: GitHub Actions → Docker Hub → Docker Swarm deployment (future)

#### Runtime

- **Node.js**: v22 LTS (or v24 if compatible)

---

## 3. System Components

### 3.1 Scraper Microservice

#### 3.1.1 Responsibilities

- Scrape target e-commerce sites on schedule
- Extract product data (name, price, availability, RRP)
- Normalize data into consistent format
- Submit bulk data to backend API
- Handle errors and retries
- Log scraping operations

#### 3.1.2 Configuration (Environment Variables)

```
SCRAPE_SCHEDULE=0 0 * * *  # Daily at midnight (cron format)
RATE_LIMIT_DELAY=2000      # Milliseconds between requests (default: 2000ms)
MAX_RETRIES=2              # Number of retry attempts on failure
RETRY_DELAY=5000           # Milliseconds between retries
BACKEND_API_URL=http://nest-backend:3001
API_KEY=<secure_api_key>
```

#### 3.1.3 Site Configuration Structure

Site configurations stored in JSON config files:

```json
{
  "siteId": "board-game-co-uk",
  "siteName": "Board Game Co UK",
  "baseUrl": "https://www.board-game.co.uk",
  "listPageUrl": "https://www.board-game.co.uk/category/board-games/?show=200&page=1",
  "itemType": "board-game",
  "selectors": {
    "productList": ".product-item",
    "productName": ".product-title",
    "productPrice": ".price",
    "productAvailability": ".stock-status",
    "productRRP": ".rrp-price",
    "productUrl": "a.product-link",
    "productSKU": "[data-sku]"
  },
  "rateLimitMs": 2000,
  "paginationSelector": ".next-page",
  "isActive": true
}
```

#### 3.1.4 Scraping Flow

1. Load site configuration
2. Navigate to list page using Playwright
3. Extract product listings
4. For each product, extract:
   - Product name (required)
   - Price (required, validate positive)
   - Availability (required, values: true/false/null)
   - RRP (optional)
   - Source URL (required)
   - SKU (optional)
   - Additional unstructured data (JSON object)
5. Apply rate limiting between requests
6. On failure: retry up to 2 times with delay, then log and continue
7. Normalize data format
8. Submit bulk upload to backend API endpoint
9. Record scraping metadata (timestamp, success/failure, response times)

#### 3.1.5 Error Handling

- **Retry Logic**: 2 additional attempts with configurable delay
- **Failure Logging**: Record failed scrapes in database via API
- **Continuation**: Continue with remaining items after individual failures
- **Alerts**: Log critical failures for monitoring

---

### 3.2 Backend API (NestJS)

#### 3.2.1 Core Modules

- **Products Module**: CRUD operations for products
- **Price History Module**: Record and retrieve historical data
- **Tracking Module**: User tracking preferences
- **Wishlist Module**: User wishlist management (post-MVP)
- **Scraper Module**: Manual trigger endpoints, job management
- **Notifications Module**: Discord webhook integration (post-MVP)

#### 3.2.2 API Endpoints

##### Products API

```
GET    /api/v1/products
  Query params:
    - search: string (product name search)
    - minPrice: number
    - maxPrice: number
    - availability: boolean
    - sortBy: price|name|recentlyAdded|priceChange
    - sortOrder: asc|desc
    - page: number
    - limit: number
  Response:
    - products: Array<Product with 7-day price summary>
    - pagination: { total, page, limit, pages }

GET    /api/v1/products/:id
  Response:
    - product: Product details
    - priceHistory: Array<PriceHistoryEntry>

GET    /api/v1/products/:id/history
  Query params:
    - range: 7d|30d|90d|all
  Response:
    - history: Array<PriceHistoryEntry>
```

##### Bulk Upload API (Scraper)

```
POST   /api/v1/scraper/bulk-upload
  Headers:
    - Authorization: Bearer <API_KEY>
  Body:
    {
      "scrapeTimestamp": "2026-01-06T12:00:00Z",
      "siteId": "board-game-co-uk",
      "products": [
        {
          "name": "Catan",
          "price": 29.99,
          "availability": true,
          "rrp": 39.99,
          "sourceUrl": "https://...",
          "sourceName": "Board Game Co UK",
          "sku": "BG12345",
          "type": "board-game",
          "additionalData": { ... }
        }
      ]
    }
  Response:
    - created: number
    - updated: number
    - errors: Array<error details>
```

##### Tracking API

```
GET    /api/v1/tracking
  Response:
    - trackedItems: Array<TrackedItem with product details>

POST   /api/v1/tracking
  Body:
    {
      "productId": "uuid",
      "conditions": {
        "trackType": "general" | "price_drop" | "back_in_stock"
        "priceThreshold": number (optional)
        "priceDropPercent": number (optional)
      }
    }

DELETE /api/v1/tracking/:productId

GET    /api/v1/tracking/alerts
  Response:
    - alerts: Array<items matching tracking conditions>
```

##### Wishlist API (Post-MVP)

```
GET    /api/v1/wishlists
POST   /api/v1/wishlists
GET    /api/v1/wishlists/:id
PUT    /api/v1/wishlists/:id
DELETE /api/v1/wishlists/:id
POST   /api/v1/wishlists/:id/items
DELETE /api/v1/wishlists/:id/items/:productId
```

##### Scraper Management API

```
POST   /api/v1/scraper/trigger
  Body:
    {
      "siteId": "board-game-co-uk" (optional, all if not specified)
    }
  Response:
    - jobId: string
    - status: "queued"

GET    /api/v1/scraper/status/:jobId
  Response:
    - status: "queued" | "processing" | "completed" | "failed"
    - progress: object
```

#### 3.2.3 Environment Variables

```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pricetracker
SQLITE_PATH=./dev.db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API
API_PORT=3001
API_VERSION=v1
SCRAPER_API_KEY=<secure_key>

# Notifications (Post-MVP)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Features
ENABLE_DISCORD_NOTIFICATIONS=false
```

---

### 3.3 Database Schema (Prisma)

#### 3.3.1 Core Models

```prisma
model Product {
  id            String    @id @default(uuid())
  name          String
  type          String    @default("board-game")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  priceHistory  PriceHistory[]
  tracking      ProductTracking[]
  wishlistItems WishlistItem[]

  @@index([name])
  @@index([type])
}

model ProductSource {
  id              String    @id @default(uuid())
  productId       String
  sourceName      String    // "Board Game Co UK"
  sourceUrl       String    @unique
  sku             String?
  additionalData  Json?     // Unstructured data
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  product         Product   @relation(fields: [productId], references: [id])
  priceHistory    PriceHistory[]

  @@index([productId])
  @@index([sourceName])
}

model PriceHistory {
  id              String    @id @default(uuid())
  productId       String
  sourceId        String
  price           Decimal   @db.Decimal(10, 2)
  availability    Boolean?  // true, false, null for unknown
  rrp             Decimal?  @db.Decimal(10, 2)
  scrapedAt       DateTime  @default(now())

  // Scraping metadata
  scrapeSuccess   Boolean   @default(true)
  scrapeJobId     String?
  responseTimeMs  Int?

  product         Product       @relation(fields: [productId], references: [id])
  source          ProductSource @relation(fields: [sourceId], references: [id])

  @@index([productId, scrapedAt])
  @@index([sourceId, scrapedAt])
  @@index([scrapedAt])
}

model ProductTracking {
  id              String    @id @default(uuid())
  productId       String
  userId          String?   // Null for MVP (localStorage), populated later

  // Tracking conditions
  trackType       String    @default("general") // general, price_drop, back_in_stock
  priceThreshold  Decimal?  @db.Decimal(10, 2)
  priceDropPercent Decimal? @db.Decimal(5, 2)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  product         Product   @relation(fields: [productId], references: [id])

  @@index([productId])
  @@index([userId])
}

model Wishlist {
  id          String    @id @default(uuid())
  userId      String?   // Null for MVP
  name        String
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  items       WishlistItem[]

  @@index([userId])
}

model WishlistItem {
  id          String    @id @default(uuid())
  wishlistId  String
  productId   String
  addedAt     DateTime  @default(now())
  notes       String?

  wishlist    Wishlist  @relation(fields: [wishlistId], references: [id])
  product     Product   @relation(fields: [productId], references: [id])

  @@unique([wishlistId, productId])
  @@index([wishlistId])
  @@index([productId])
}

model ScrapeLog {
  id              String    @id @default(uuid())
  jobId           String    @unique
  siteId          String
  status          String    // queued, processing, completed, failed
  startedAt       DateTime?
  completedAt     DateTime?
  productsScraped Int       @default(0)
  errors          Json?
  createdAt       DateTime  @default(now())

  @@index([siteId, createdAt])
  @@index([status])
}
```

#### 3.3.2 Data Validation Rules

- `price`: Must be positive (> 0)
- `availability`: Must be `true`, `false`, or `null`
- `rrp`: Must be positive if present, otherwise `null`
- Missing data fields: Set to `null`

---

### 3.4 Frontend (Next.js)

#### 3.4.1 Pages/Routes

```
/                           - Homepage with tracked items and custom views
/products                   - Product search and browse
/products/[id]              - Individual product detail with full history
/tracking                   - Manage tracked items (MVP)
/wishlists                  - Manage wishlists (Post-MVP)
/settings                   - User preferences (Post-MVP)
```

#### 3.4.2 Homepage Components

**Tracked Items Section**

- Display all tracked items with:
  - Product name and current price
  - Sparkline showing price trend
  - Price change indicator (↑↓ with percentage)
  - Availability status badge
  - "In stock" / "Out of stock" / "Unknown"
  - Link to product detail page

**Custom View Lists** (Post-MVP)
User can configure which lists to show:

- Recently Price Dropped (top 10)
- Newly In Stock (top 10)
- Custom saved searches

Each list item shows:

- Product thumbnail (if available)
- Name
- Current price vs previous price
- Change percentage
- Quick "Track" button

#### 3.4.3 Product Search Page

**Search & Filters**

- Search bar (fuzzy search on product name)
- Filters:
  - Price range slider (min-max)
  - Availability toggle (In Stock / Out of Stock / All)
  - Newly available (checkbox)
  - Sort by: Price (asc/desc), Name (A-Z), Recently Added, Price Change %

**Results Display**

- Grid or list view of products
- Each product card shows:
  - Name
  - Current price
  - 7-day mini price history (small sparkline)
  - Availability badge
  - Track button (heart icon or star)

**Pagination**

- Client-side or server-side pagination
- Configurable items per page

#### 3.4.4 Product Detail Page

**Product Information**

- Product name (h1)
- Current price (large, prominent)
- RRP (if available, showing savings)
- Availability status
- Source link (external link to retailer)
- SKU (if available)
- Track button (toggle on/off)
- Add to Wishlist button (Post-MVP)

**Price History Chart**

- Large, interactive line chart (Recharts)
- Time range selector: 7 days | 30 days | 90 days | All time
- Y-axis: Price
- X-axis: Date
- Visual indicators for:
  - Out of stock periods (grayed out or dashed line)
  - Price changes (markers)
- Hover tooltip showing exact price and date

**Historical Data Table** (Optional enhancement)

- Sortable table showing all historical records
- Columns: Date, Price, Availability, RRP

#### 3.4.5 Tracking Management Page (MVP)

**Tracked Items List**

- Table or card view of all tracked items
- Each entry shows:
  - Product details
  - Current tracking conditions
  - Edit/Remove buttons

**Add New Tracking**

- Search for product
- Select tracking type:
  - General tracking (MVP)
  - Price drops below X (Post-MVP)
  - Back in stock (Post-MVP)
  - Price drops by X% (Post-MVP)

#### 3.4.6 Local Storage Structure (MVP)

```typescript
// localStorage key: "trackedProducts"
{
  "tracked": [
    {
      "productId": "uuid",
      "addedAt": "2026-01-06T12:00:00Z",
      "conditions": {
        "trackType": "general"
      }
    }
  ]
}

// localStorage key: "userPreferences"
{
  "homeViewLists": ["recentlyDropped", "newlyInStock"],
  "defaultSearchSort": "price-asc",
  "notificationsEnabled": false
}
```

#### 3.4.7 State Management

- React hooks (useState, useEffect, useContext)
- Data fetching: SWR or React Query (recommended for caching)
- Local storage sync on component mount/unmount

---

## 4. Features Breakdown

### 4.1 MVP Features (Must-Have)

#### Scraper Service

- ✅ Daily scraping of `https://www.board-game.co.uk/category/board-games/?show=200&page=1`
- ✅ Playwright-based scraping with rate limiting
- ✅ Configurable via environment variables
- ✅ Retry logic (2 retries with delay)
- ✅ Bulk upload to backend API
- ✅ Manual trigger endpoint
- ✅ Error logging

#### Backend API

- ✅ Product CRUD operations
- ✅ Price history recording (separate row per scrape)
- ✅ Bulk upload endpoint for scraper
- ✅ Product search with filters
- ✅ Individual product with history retrieval
- ✅ Basic tracking endpoints (create, delete, list)
- ✅ Manual scrape trigger endpoint
- ✅ SQLite for development
- ✅ PostgreSQL for production
- ✅ Prisma ORM
- ✅ API versioning (`/api/v1/`)

#### Frontend

- ✅ Homepage with tracked items + sparklines
- ✅ Product search with filters (price range, availability, name)
- ✅ Product detail page with price history chart
- ✅ Time range selector (7d, 30d, 90d, all)
- ✅ Out-of-stock period visualization
- ✅ Track/untrack functionality (localStorage)
- ✅ Tracking management page
- ✅ Responsive design

#### Infrastructure

- ✅ Docker Compose setup (Next, Nest, PostgreSQL, Redis)
- ✅ Development and production configurations
- ✅ README with setup instructions

### 4.2 Post-MVP Features (Nice-to-Have)

#### Phase 2: Enhanced Tracking

- ⏭️ Advanced tracking conditions:
  - Price drops below threshold
  - Back in stock notifications
  - Price drops by percentage
- ⏭️ Discord webhook notifications
  - Simple text + link format
  - Single webhook for all users initially

#### Phase 3: Wishlist & Organization

- ⏭️ Wishlist CRUD operations
- ⏭️ Add tracked items to wishlists
- ⏭️ Multiple wishlists per user
- ⏭️ Wishlist sharing (future)

#### Phase 4: Custom Views

- ⏭️ Recently price-dropped products list
- ⏭️ Newly in-stock products list
- ⏭️ User-configurable homepage views
- ⏭️ Saved custom search filters

#### Phase 5: Authentication & Multi-User

- ⏭️ OAuth integration (NextAuth)
- ⏭️ Google OAuth provider
- ⏭️ User accounts and profiles
- ⏭️ Personal tracking history
- ⏭️ Per-user Discord webhooks

#### Phase 6: Multi-Site Support

- ⏭️ Additional board game retailers
- ⏭️ Site configuration management
- ⏭️ Cross-site product matching
- ⏭️ Unified product entities across sources

#### Phase 7: Deployment

- ⏭️ GitHub Actions CI/CD pipeline
- ⏭️ Automated testing in pipeline
- ⏭️ Docker image building and push to Docker Hub
- ⏭️ Docker Swarm deployment
- ⏭️ Production monitoring and alerting

---

## 5. Testing Strategy

### 5.1 Testing Framework

- **Framework**: Jest
- **Coverage Target**: >70% for critical paths

### 5.2 Test Types

#### Unit Tests

- **Backend**:
  - Service layer business logic
  - Data transformation functions
  - Validation logic
  - Price calculation utilities
- **Frontend**:
  - Component rendering
  - Utility functions
  - Data formatting helpers

#### Integration Tests

- API endpoint testing
- Database operations
- Scraper data flow (mock Playwright)

#### E2E Tests (Future)

- Critical user flows
- Scraping to display pipeline

---

## 6. Deployment & DevOps

### 6.1 Local Development Setup

#### Prerequisites

- Node.js v22 LTS (or v24 if compatible)
- Docker & Docker Compose
- Git

#### Environment Files

```
# .env.development
DATABASE_URL=file:./dev.db
REDIS_HOST=localhost
REDIS_PORT=6379
API_PORT=3001
SCRAPE_SCHEDULE=0 */6 * * *
RATE_LIMIT_DELAY=2000

# .env.production
DATABASE_URL=postgresql://user:pass@postgres:5432/pricetracker
REDIS_HOST=redis
REDIS_PORT=6379
API_PORT=3001
SCRAPE_SCHEDULE=0 0 * * *
RATE_LIMIT_DELAY=2000
```

#### Docker Compose Services

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  scraper:
    build: ./scraper
    depends_on:
      - backend
      - redis

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 6.2 Production Deployment (Future)

#### CI/CD Pipeline (GitHub Actions)

1. Trigger on push to `main` branch
2. Run linting and type checking
3. Run unit tests
4. Build Docker images
5. Push images to Docker Hub
6. Deploy to Docker Swarm cluster
7. Run smoke tests

#### Docker Swarm Configuration

- Multi-node cluster
- Service replication
- Load balancing
- Automatic restarts
- Secret management

---

## 7. Data Flow Diagrams

### 7.1 Scraping Flow

```
[Cron Schedule] → [BullMQ Queue] → [Scraper Service]
                                          ↓
                               [Playwright Browser]
                                          ↓
                              [Extract Product Data]
                                          ↓
                                [Normalize Data]
                                          ↓
                          [POST /api/v1/scraper/bulk-upload]
                                          ↓
                                  [NestJS Backend]
                                          ↓
                              [Prisma ORM Operations]
                                          ↓
                          [PostgreSQL: Products + PriceHistory]
```

### 7.2 User Tracking Flow

```
[User clicks "Track"] → [Frontend localStorage update]
                                   ↓
                      [POST /api/v1/tracking]
                                   ↓
                             [NestJS Backend]
                                   ↓
                       [Save to ProductTracking table]
                                   ↓
                    [Homepage displays tracked items]
                                   ↓
              [Fetch price history for sparklines]
                                   ↓
                  [Display with price change indicators]
```

---

## 8. Non-Functional Requirements

### 8.1 Performance

- API response time: <500ms for list queries, <1s for detail queries
- Scraping: Complete full site scrape in <30 minutes
- Frontend: First contentful paint <2s
- Chart rendering: Smooth for datasets up to 365 data points

### 8.2 Scalability

- Support for 10,000+ products initially
- Efficient pagination for large result sets
- Database indexing on frequently queried fields
- Potential for horizontal scaling via Docker Swarm

### 8.3 Reliability

- Scraper uptime: 95%+
- Database backups: Daily (production)
- Error recovery: Automatic retries with exponential backoff
- Graceful degradation when external sites are unavailable

### 8.4 Security

- API key authentication for scraper endpoints
- Rate limiting on public APIs (future)
- HTTPS in production
- SQL injection prevention via Prisma ORM
- XSS protection via React's default escaping

### 8.5 Maintainability

- TypeScript for type safety
- Clear module boundaries
- Comprehensive README documentation
- Environment-based configuration
- Consistent code style (ESLint, Prettier)

---

## 9. Success Criteria

### 9.1 MVP Launch Criteria

- [ ] Successful daily scraping of board-game.co.uk with <5% error rate
- [ ] Complete historical data storage for all products
- [ ] Functional search and filter on frontend
- [ ] Price history visualization with all time ranges
- [ ] Track/untrack functionality working
- [ ] Homepage displaying tracked items with sparklines
- [ ] Manual scrape trigger functioning
- [ ] Docker Compose setup working for both dev and prod
- [ ] README with complete setup instructions
- [ ] Basic unit test coverage (>50%) for critical paths

### 9.2 Post-MVP Milestones

- Phase 2: Discord notifications working for price drops
- Phase 3: Wishlist management functional
- Phase 4: Custom views and saved searches operational
- Phase 5: OAuth authentication implemented
- Phase 6: Second retailer site integrated
- Phase 7: CI/CD pipeline deployed to production

---

## 10. Open Questions & Future Considerations

### 10.1 To Be Determined

- Exact scraping schedule optimization based on site update patterns
- Data retention policy (how long to keep historical data)
- Rate limiting strategy for production API
- Monitoring and alerting tools (Prometheus, Grafana, etc.)
- Analytics tracking (user behavior, popular products)

### 10.2 Future Enhancements

- Mobile app (React Native)
- Price prediction using ML models
- Price drop alerts via email/SMS
- Browser extension for quick tracking
- Public API for third-party integrations
- Community features (shared wishlists, reviews)
- Multi-currency support for international retailers
- BoardGameGeek (BGG) catalog import and product enrichment (canonical game IDs)
- Basic admin console for catalog editing and data quality (single-admin access)

---

## 11. Appendix

### 11.1 Technology Justifications

**Why Next.js?**

- Server-side rendering for better SEO
- Excellent developer experience
- Built-in API routes (if needed)
- Strong ecosystem and community

**Why NestJS?**

- TypeScript-first framework
- Modular architecture
- Excellent for microservices
- Built-in dependency injection
- Strong testing support

**Why Prisma?**

- Type-safe database queries
- Excellent TypeScript integration
- Easy migrations
- Multi-database support (SQLite + PostgreSQL)

**Why Playwright?**

- Modern, fast, and reliable
- Better handling of dynamic content than Cheerio
- Built-in retry and wait mechanisms
- Cross-browser support

**Why BullMQ?**

- Robust job queue system
- Redis-backed for reliability
- Job retry and failure handling
- Dashboard for monitoring

**Why Recharts?**

- React-native, no D3 wrapper complexity
- Wide adoption and active maintenance
- Responsive and customizable
- Good performance for typical datasets

### 11.2 Key Dependencies

**Frontend**

```json
{
  "next": "^16.0.0",
  "react": "^19.0.0",
  "recharts": "^2.12.0",
  "swr": "^2.2.0",
  "tailwindcss": "^4.0.0"
}
```

**Backend**

```json
{
  "@nestjs/core": "^10.0.0",
  "@prisma/client": "^6.0.0",
  "bullmq": "^5.0.0",
  "redis": "^4.6.0"
}
```

**Scraper**

```json
{
  "playwright": "^1.48.0",
  "bullmq": "^5.0.0",
  "axios": "^1.7.0"
}
```

### 11.3 Glossary

- **RRP**: Recommended Retail Price (MSRP in US)
- **Sparkline**: Small inline chart showing trend without axes
- **Scrape**: Automated extraction of data from websites
- **Bulk Upload**: Single API call with multiple product records
- **Price History**: Time-series data of price changes
- **Tracking**: User-defined monitoring of specific products
- **Wishlist**: Curated collection of products user is interested in

---

## Document Approval

**Prepared by**: AI Product Manager  
**Date**: January 6, 2026  
**Status**: Ready for Development  
**Next Steps**: Begin development with MVP feature set, starting with scraper service and backend API foundation.

---

**END OF DOCUMENT**
