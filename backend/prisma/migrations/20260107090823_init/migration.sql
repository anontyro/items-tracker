-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'board-game',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSource" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sku" TEXT,
    "additionalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "availability" BOOLEAN,
    "rrp" DECIMAL(10,2),
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scrapeSuccess" BOOLEAN NOT NULL DEFAULT true,
    "scrapeJobId" TEXT,
    "responseTimeMs" INTEGER,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTracking" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "trackType" TEXT NOT NULL DEFAULT 'general',
    "priceThreshold" DECIMAL(10,2),
    "priceDropPercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_type_idx" ON "Product"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSource_sourceUrl_key" ON "ProductSource"("sourceUrl");

-- CreateIndex
CREATE INDEX "ProductSource_productId_idx" ON "ProductSource"("productId");

-- CreateIndex
CREATE INDEX "ProductSource_sourceName_idx" ON "ProductSource"("sourceName");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_scrapedAt_idx" ON "PriceHistory"("productId", "scrapedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_sourceId_scrapedAt_idx" ON "PriceHistory"("sourceId", "scrapedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_scrapedAt_idx" ON "PriceHistory"("scrapedAt");

-- CreateIndex
CREATE INDEX "ProductTracking_productId_idx" ON "ProductTracking"("productId");

-- CreateIndex
CREATE INDEX "ProductTracking_userId_idx" ON "ProductTracking"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- AddForeignKey
ALTER TABLE "ProductSource" ADD CONSTRAINT "ProductSource_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTracking" ADD CONSTRAINT "ProductTracking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
