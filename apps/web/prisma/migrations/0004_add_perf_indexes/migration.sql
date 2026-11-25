-- Index de performance sur les colonnes fréquemment filtrées ou triées
-- (hors index déjà créés dans 0001_init et 0003_bloc0_contracts)
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

CREATE INDEX IF NOT EXISTS "Registration_createdAt_idx" ON "Registration"("createdAt");
CREATE INDEX IF NOT EXISTS "Registration_statut_updatedAt_idx" ON "Registration"("statut", "updatedAt");

CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");

CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

CREATE INDEX IF NOT EXISTS "Appointment_statut_debut_idx" ON "Appointment"("statut", "debut");

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "FraudAlert_resolu_createdAt_idx" ON "FraudAlert"("resolu", "createdAt");
