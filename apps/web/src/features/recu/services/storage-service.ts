import { createClient } from "@supabase/supabase-js";
import type { PaymentMethod } from "@smartinscription/shared";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdfBuffer } from "./pdf-service";

const RECEIPTS_BUCKET = "receipts";

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || url.includes("[YOUR-PROJECT-REF]")) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Génère le PDF du reçu et le dépose dans le bucket privé Supabase Storage. */
export async function generateAndStoreReceiptPdf(paymentId: string): Promise<string | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      registration: {
        include: {
          student: {
            include: {
              user: true,
              ufr: true,
              filiere: true,
            },
          },
        },
      },
    },
  });

  if (!payment || !payment.qrToken || !payment.receiptNumber || !payment.paidAt) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const student = payment.registration.student;
  const pdfBytes = await generateReceiptPdfBuffer({
    receiptNumber: payment.receiptNumber,
    providerRef: payment.providerRef,
    qrToken: payment.qrToken,
    paidAt: payment.paidAt,
    montant: payment.montant,
    moyen: payment.moyen as PaymentMethod,
    studentName: `${student.user.prenom} ${student.user.nom}`,
    numeroEtudiant: student.numeroEtudiant,
    ufrNom: student.ufr.nom,
    filiereNom: student.filiere.nom,
    niveau: student.niveau,
    anneeAcademique: payment.registration.anneeAcademique,
  });

  // Crée le bucket privé s'il n'existe pas encore
  await supabase.storage.createBucket(RECEIPTS_BUCKET, { public: false }).catch(() => null);

  const storagePath = `${student.userId}/${payment.id}.pdf`;
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.warn(`[recu] Échec upload Supabase Storage pour payment=${payment.id}:`, error.message);
    return null;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { receiptUrl: storagePath },
  });

  return storagePath;
}

/** Retourne une URL signée courte durée (120s) pour le téléchargement privé du reçu. */
export async function getSignedReceiptDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, 120, { download: true });

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
