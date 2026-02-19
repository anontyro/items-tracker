-- CreateEnum
CREATE TYPE "ScrapeRunStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" "ScrapeRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "runId" TEXT,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapeRun_siteId_finishedAt_idx" ON "ScrapeRun"("siteId", "finishedAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_siteId_status_finishedAt_idx" ON "ScrapeRun"("siteId", "status", "finishedAt");
