-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LOGIN', 'CHECK_IN');

-- CreateEnum
CREATE TYPE "AiClassification" AS ENUM ('CONFORME', 'A_VERIFIER', 'SUSPECT');

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "heure" INTEGER,
ADD COLUMN     "ufrId" TEXT;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "aiAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "aiClass" "AiClassification",
ADD COLUMN     "aiScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" UUID,
    "type" "ActivityType" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_type_createdAt_idx" ON "ActivityLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "Prediction_ufrId_idx" ON "Prediction"("ufrId");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_ufrId_fkey" FOREIGN KEY ("ufrId") REFERENCES "UFR"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

