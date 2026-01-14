-- DropIndex
DROP INDEX "Product_bggId_key";

-- CreateIndex
CREATE INDEX "Product_bggId_idx" ON "Product"("bggId");
