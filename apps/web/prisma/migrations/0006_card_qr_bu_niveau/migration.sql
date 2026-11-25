-- Ajout de cardQrVersion sur Student, niveau et accès BU sur Registration
CREATE TYPE "BuStatus" AS ENUM ('NONE', 'ACTIVE');

ALTER TABLE "Student"
ADD COLUMN "cardQrVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Registration"
ADD COLUMN "niveau" TEXT,
ADD COLUMN "buStatus" "BuStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "buValidatedAt" TIMESTAMP(3),
ADD COLUMN "buValidatedById" UUID;

-- Reprise : copie le niveau actuel de l'étudiant sur ses inscriptions sans niveau
UPDATE "Registration" r
SET "niveau" = s."niveau"
FROM "Student" s
WHERE r."studentId" = s."id"
  AND r."niveau" IS NULL;

CREATE INDEX "Registration_buValidatedById_idx" ON "Registration"("buValidatedById");

ALTER TABLE "Registration"
ADD CONSTRAINT "Registration_buValidatedById_fkey"
FOREIGN KEY ("buValidatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
