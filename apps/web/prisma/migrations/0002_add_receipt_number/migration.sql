-- Ajout du numéro de reçu séquentiel unique et de la séquence PostgreSQL dédiée
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

CREATE SEQUENCE IF NOT EXISTS "receipt_number_seq" START WITH 1 INCREMENT BY 1;
