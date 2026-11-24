import { createClient } from "@supabase/supabase-js";
import {
  canTransition,
  CURRENT_ACADEMIC_YEAR,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPE_LABELS_FR,
  DOCUMENT_TYPES,
  REGISTRATION_STATUSES,
  ROLES,
  type DocumentType,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import { notifyUser } from "@/features/notifications/services/notification-service";
import { prisma } from "@/lib/prisma";

export const DOCUMENTS_BUCKET = "documents";
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  DOCUMENT_TYPES.ID_CARD,
  DOCUMENT_TYPES.TRANSCRIPT,
  DOCUMENT_TYPES.DIPLOMA,
  DOCUMENT_TYPES.PHOTO,
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes("[YOUR-PROJECT-REF]")) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

/** Téléverse une pièce justificative dans le bucket privé et met à jour le dossier. */
export async function uploadStudentDocument(params: {
  userId: string;
  type: DocumentType;
  file: File;
}) {
  if (
    !ALLOWED_DOCUMENT_MIME_TYPES.includes(
      params.file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
    )
  ) {
    throw new Error("Format non supporté. Formats acceptés : PDF, JPG, PNG ou WEBP.");
  }

  if (params.file.size <= 0 || params.file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("Le fichier doit faire entre 1 octet et 5 Mo.");
  }

  const student = await prisma.student.findUnique({
    where: { userId: params.userId },
    include: {
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        take: 1,
      },
    },
  });

  const registration = student?.registrations[0];
  if (!student || !registration) {
    throw new Error("Veuillez d'abord compléter votre dossier étudiant.");
  }

  const allowedRegStatuses: RegistrationStatus[] = [
    REGISTRATION_STATUSES.PAID,
    REGISTRATION_STATUSES.DOCS_INCOMPLETE,
    REGISTRATION_STATUSES.DOCS_COMPLETE,
  ];
  if (!allowedRegStatuses.includes(registration.statut as RegistrationStatus)) {
    throw new Error(
      "Vous devez d'abord régler les frais d'inscription (25 000 FCFA) avant de déposer vos pièces."
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Stockage Supabase non configuré.");
  }

  await supabase.storage.createBucket(DOCUMENTS_BUCKET, { public: false }).catch(() => null);

  const ext = extensionFromMime(params.file.type);
  const storagePath = `${params.userId}/${registration.id}/${params.type}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: params.file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Échec du téléversement : ${uploadError.message}`);
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.document.findFirst({
      where: { registrationId: registration.id, type: params.type },
    });

    if (existing) {
      await tx.document.update({
        where: { id: existing.id },
        data: {
          url: storagePath,
          verificationStatus: DOCUMENT_STATUSES.PENDING,
          motif: null,
        },
      });
    } else {
      await tx.document.create({
        data: {
          registrationId: registration.id,
          type: params.type,
          url: storagePath,
          verificationStatus: DOCUMENT_STATUSES.PENDING,
        },
      });
    }

    if (
      registration.statut === REGISTRATION_STATUSES.PAID &&
      canTransition(registration.statut, REGISTRATION_STATUSES.DOCS_INCOMPLETE)
    ) {
      await tx.registration.update({
        where: { id: registration.id },
        data: { statut: REGISTRATION_STATUSES.DOCS_INCOMPLETE },
      });
    }
  });
}

/** Retourne une URL signée courte durée pour consulter un document privé. */
export async function getSignedDocumentUrl(storagePath: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 120);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

/** Approuve ou rejette un document (AGENT ou ADMIN) et met à jour le statut du dossier. */
export async function reviewStudentDocument(params: {
  documentId: string;
  decision: "APPROVED" | "REJECTED";
  motif?: string;
  reviewerRole: Role;
}) {
  if (params.reviewerRole !== ROLES.AGENT && params.reviewerRole !== ROLES.ADMIN) {
    throw new Error("Action réservée aux agents et administrateurs.");
  }

  if (params.decision === "REJECTED" && (!params.motif || params.motif.trim().length < 3)) {
    throw new Error("Veuillez indiquer un motif de rejet (minimum 3 caractères).");
  }

  const doc = await prisma.document.findUnique({
    where: { id: params.documentId },
    include: {
      registration: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
  });

  if (!doc) {
    throw new Error("Document introuvable.");
  }

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      verificationStatus: params.decision,
      motif: params.decision === "REJECTED" ? params.motif?.trim() : null,
    },
  });

  const allDocs = await prisma.document.findMany({
    where: { registrationId: doc.registrationId },
  });

  const allRequiredApproved = REQUIRED_DOCUMENT_TYPES.every((reqType) =>
    allDocs.some(
      (d) => d.type === reqType && d.verificationStatus === DOCUMENT_STATUSES.APPROVED
    )
  );

  const currentRegStatus = doc.registration.statut as RegistrationStatus;
  if (
    allRequiredApproved &&
    canTransition(currentRegStatus, REGISTRATION_STATUSES.DOCS_COMPLETE)
  ) {
    await prisma.registration.update({
      where: { id: doc.registrationId },
      data: { statut: REGISTRATION_STATUSES.DOCS_COMPLETE },
    });
  } else if (
    !allRequiredApproved &&
    currentRegStatus === REGISTRATION_STATUSES.PAID &&
    canTransition(currentRegStatus, REGISTRATION_STATUSES.DOCS_INCOMPLETE)
  ) {
    await prisma.registration.update({
      where: { id: doc.registrationId },
      data: { statut: REGISTRATION_STATUSES.DOCS_INCOMPLETE },
    });
  }

  const studentUser = doc.registration.student.user;
  const docLabel = DOCUMENT_TYPE_LABELS_FR[doc.type as DocumentType];
  const message =
    params.decision === "APPROVED"
      ? `Votre document « ${docLabel} » a été approuvé.`
      : `Votre document « ${docLabel} » a été rejeté : ${params.motif?.trim()}.`;

  await notifyUser({
    userId: studentUser.id,
    email: studentUser.email,
    type: params.decision === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
    message,
    emailSubject:
      params.decision === "APPROVED"
        ? `Document approuvé : ${docLabel}`
        : `Action requise : document rejeté (${docLabel})`,
    emailHtml: `<p>Bonjour ${studentUser.prenom},</p><p>${message}</p>`,
  });
}

/** Valide ou rejette définitivement un dossier d'inscription (AGENT ou ADMIN). */
export async function finalizeRegistration(params: {
  registrationId: string;
  decision: "VALIDATED" | "REJECTED";
  reviewerRole: Role;
}) {
  if (params.reviewerRole !== ROLES.AGENT && params.reviewerRole !== ROLES.ADMIN) {
    throw new Error("Action réservée aux agents et administrateurs.");
  }

  const registration = await prisma.registration.findUnique({
    where: { id: params.registrationId },
    include: {
      student: { include: { user: true } },
    },
  });

  if (!registration) {
    throw new Error("Inscription introuvable.");
  }

  const targetStatus =
    params.decision === "VALIDATED"
      ? REGISTRATION_STATUSES.VALIDATED
      : REGISTRATION_STATUSES.REJECTED;

  if (!canTransition(registration.statut as RegistrationStatus, targetStatus)) {
    throw new Error(
      `Impossible de passer du statut ${registration.statut} à ${targetStatus}.`
    );
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: { statut: targetStatus },
  });

  const studentUser = registration.student.user;
  const message =
    params.decision === "VALIDATED"
      ? "Félicitations ! Votre dossier d'inscription universitaire a été validé définitivement."
      : "Votre dossier d'inscription a été rejeté. Veuillez contacter la scolarité.";

  await notifyUser({
    userId: studentUser.id,
    email: studentUser.email,
    type:
      params.decision === "VALIDATED"
        ? "REGISTRATION_VALIDATED"
        : "REGISTRATION_REJECTED",
    message,
    emailSubject:
      params.decision === "VALIDATED"
        ? "Inscription universitaire validée"
        : "Dossier d'inscription rejeté",
    emailHtml: `<p>Bonjour ${studentUser.prenom},</p><p>${message}</p>`,
  });
}
