import { NextResponse } from "next/server";
import {
  PAYMENT_STATUSES,
  ROLES,
  type PaymentMethod,
} from "@smartinscription/shared";
import { getCurrentUser } from "@/features/auth/lib/session";
import { generateReceiptPdfBuffer } from "@/features/recu/services/pdf-service";
import {
  generateAndStoreReceiptPdf,
  getSignedReceiptDownloadUrl,
} from "@/features/recu/services/storage-service";
import { prisma } from "@/lib/prisma";

/** Téléchargement sécurisé du reçu PDF (propriétaire ou ADMIN uniquement). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ paymentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { paymentId } = await context.params;
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

  if (!payment || payment.statut !== PAYMENT_STATUSES.SUCCESS || !payment.qrToken || !payment.receiptNumber) {
    return NextResponse.json({ error: "Reçu introuvable." }, { status: 404 });
  }

  const student = payment.registration.student;
  const isOwner = student.userId === user.id;
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  // Tente de récupérer une URL signée courte durée depuis le bucket privé Supabase Storage
  let storagePath = payment.receiptUrl;
  if (!storagePath) {
    storagePath = await generateAndStoreReceiptPdf(payment.id);
  }

  if (storagePath) {
    const signedUrl = await getSignedReceiptDownloadUrl(storagePath);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }
  }

  // Repli serveur si le bucket Storage n'est pas disponible
  const pdfBytes = await generateReceiptPdfBuffer({
    receiptNumber: payment.receiptNumber,
    providerRef: payment.providerRef,
    qrToken: payment.qrToken,
    paidAt: payment.paidAt ?? payment.createdAt,
    montant: payment.montant,
    moyen: payment.moyen as PaymentMethod,
    studentName: `${student.user.prenom} ${student.user.nom}`,
    numeroEtudiant: student.numeroEtudiant,
    ufrNom: student.ufr.nom,
    filiereNom: student.filiere.nom,
    niveau: student.niveau,
    anneeAcademique: payment.registration.anneeAcademique,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${payment.receiptNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
