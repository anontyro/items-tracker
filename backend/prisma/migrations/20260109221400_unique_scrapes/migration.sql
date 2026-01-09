/*
  Warnings:

  - A unique constraint covering the columns `[productId,sourceId,scrapedAt]` on the table `PriceHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_productId_sourceId_scrapedAt_key" ON "PriceHistory"("productId", "sourceId", "scrapedAt");
