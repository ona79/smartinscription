-- Ajout des informations de naissance et nationalité pour la carte étudiante numérique
ALTER TABLE "Student"
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "birthPlace" TEXT,
ADD COLUMN "nationality" TEXT;
