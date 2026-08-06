-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BaseHalf" AS ENUM ('FIRST', 'SECOND');

-- CreateTable
CREATE TABLE "KpiEvaluation" (
    "id" TEXT NOT NULL,
    "employeeLoginId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "teamName" TEXT,
    "position" TEXT NOT NULL,
    "baseYear" INTEGER NOT NULL,
    "baseHalf" "BaseHalf" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',

    CONSTRAINT "KpiEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiItem" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "evaluationArea" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "metric" TEXT,
    "targetValue" TEXT,
    "targetCount" INTEGER NOT NULL,
    "achievedCount" INTEGER NOT NULL DEFAULT 0,
    "weight" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "KpiItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KpiEvaluation_baseYear_baseHalf_idx" ON "KpiEvaluation"("baseYear", "baseHalf");

-- CreateIndex
CREATE INDEX "KpiEvaluation_departmentName_idx" ON "KpiEvaluation"("departmentName");

-- CreateIndex
CREATE INDEX "KpiEvaluation_employeeName_idx" ON "KpiEvaluation"("employeeName");

-- CreateIndex
CREATE INDEX "KpiEvaluation_deletedAt_idx" ON "KpiEvaluation"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KpiEvaluation_employeeLoginId_baseYear_baseHalf_deletedAt_key" ON "KpiEvaluation"("employeeLoginId", "baseYear", "baseHalf", "deletedAt");

-- CreateIndex
CREATE INDEX "KpiItem_evaluationId_sortOrder_idx" ON "KpiItem"("evaluationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "KpiItem" ADD CONSTRAINT "KpiItem_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "KpiEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
