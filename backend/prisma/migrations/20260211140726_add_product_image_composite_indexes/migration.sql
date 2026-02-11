-- CreateIndex
CREATE INDEX "ProductImage_bggId_status_updatedAt_idx" ON "ProductImage"("bggId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ProductImage_productId_status_updatedAt_idx" ON "ProductImage"("productId", "status", "updatedAt");
