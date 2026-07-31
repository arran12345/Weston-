-- AlterTable
ALTER TABLE "Account" ADD COLUMN "interestRatePct" REAL;
ALTER TABLE "Account" ADD COLUMN "termEndDate" DATETIME;

-- CreateTable
CREATE TABLE "AllocationStrategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "savingsAmount" REAL NOT NULL,
    "investmentAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllocationStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AllocationStrategy_userId_key" ON "AllocationStrategy"("userId");
