-- CreateTable
CREATE TABLE "BggGame" (
    "id" TEXT NOT NULL,
    "bggId" TEXT NOT NULL,
    "primaryName" TEXT NOT NULL,
    "name" TEXT,
    "yearPublished" INTEGER,
    "rank" INTEGER,
    "bayesAverage" DOUBLE PRECISION,
    "average" DOUBLE PRECISION,
    "usersRated" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "BggGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BggGame_bggId_key" ON "BggGame"("bggId");

-- CreateIndex
CREATE INDEX "BggGame_primaryName_idx" ON "BggGame"("primaryName");

-- CreateIndex
CREATE INDEX "BggGame_name_idx" ON "BggGame"("name");
