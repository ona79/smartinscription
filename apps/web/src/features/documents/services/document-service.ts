import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  canTransition,
  CURRENT_ACADEMIC_YEAR,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPE_LABELS_FR,
  DOCUMENT_TYPES,
  REGISTRATION_STATUSES,
  ROLES,
  type DocumentStatus,
  type DocumentType,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import { notifyUser } from "@/features/notifications/services/notification-service";
import { prisma } from "@/lib/prisma";
import {
  buildImposedDocumentFolder,
  CloudinaryStorageProvider,
  getStorageProvider,
  MAX_IMAGE_SIZE_BYTES,
  MAX_PDF_SIZE_BYTES,
  resolveProviderForOpaqueId,
  SupabaseStorageProvider,
  type SignedReadOptions,
  type UploadSignatureResult,
} from "./storage-provider";

export {
  DOCUMENTS_BUCKET,
  MAX_IMAGE_SIZE_BYTES,
  MAX_PDF_SIZE_BYTES,
} from "./storage-provider";

export const MAX_DOCUMENT_SIZE_BYTES = MAX_IMAGE_SIZE_BYTES;
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

const UPLOAD_RATE_WINDOW_MS = 60_000;
const UPLOAD_RATE_MAX = 20;
const memoryUploadBuckets = new Map<string, { count: number; resetAt: number }>();

let upstashUploadLimiter: Ratelimit | null | undefined;

function getUpstashUploadLimiter(): Ratelimit | null {
  if (upstashUploadLimiter !== undefined) return upstashUploadLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashUploadLimiter = null;
    return null;
  }
  upstashUploadLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(UPLOAD_RATE_MAX, "60 s"),
    prefix: "smartinscription:upload",
  });
  return upstashUploadLimiter;
}

/** Limiteur de débit pour les demandes de signature et téléversements. */
export async function checkDocumentUploadRateLimit(key: string): Promise<boolean> {
  const distributed = getUpstashUploadLimiter();
  if (distributed) {
    try {
      const res = await distributed.limit(key);
      return res.success;
    } catch {
      // Repli mémoire si Redis indisponible
    }
  }

  const now = Date.now();
  const current = memoryUploadBuckets.get(key);
  if (!current || now > current.resetAt) {
    memoryUploadBuckets.set(key, { count: 1, resetAt: now + UPLOAD_RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= UPLOAD_RATE_MAX) {
    return false;
  }
  current.count += 1;
  return true;
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

/** Vérifie si le statut du dossier autorise l'envoi ou le remplacement de cette pièce. */
export function isDocumentUploadAllowed(params: {
  registrationStatus: RegistrationStatus;
  docType: DocumentType;
  existingDocStatus?: DocumentStatus | null;
}): boolean {
  const { registrationStatus, docType, existingDocStatus } = params;

  if (registrationStatus === REGISTRATION_STATUSES.REJECTED) {
    return false;
  }

  if (registrationStatus === REGISTRATION_STATUSES.VALIDATED) {
    return (
      docType === DOCUMENT_TYPES.PHOTO &&
      existingDocStatus === DOCUMENT_STATUSES.REJECTED
    );
  }

  if (docType === DOCUMENT_TYPES.PHOTO) {
    return true;
  }

  return (
    registrationStatus === REGISTRATION_STATUSES.PAID ||
    registrationStatus === REGISTRATION_STATUSES.DOCS_INCOMPLETE ||
    registrationStatus === REGISTRATION_STATUSES.DOCS_COMPLETE
  );
}

async function getActiveStudentRegistration(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        select: {
          id: true,
          statut: true,
          documents: {
            select: {
              id: true,
              type: true,
              url: true,
              verificationStatus: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  const registration = student?.registrations[0];
  if (!student || !registration) {
    throw new Error("Veuillez d'abord compléter votre dossier étudiant.");
  }

  return { student, registration };
}

async function upsertDocumentRecord(params: {
  registrationId: string;
  registrationStatus: RegistrationStatus;
  type: DocumentType;
  opaqueId: string;
  db?: typeof prisma;
}) {
  const db = params.db ?? prisma;
  let savedDocumentId = "";

  await db.$transaction(async (tx) => {
    const existing = await tx.document.findFirst({
      where: { registrationId: params.registrationId, type: params.type },
      select: { id: true },
    });

    if (existing) {
      const updated = await tx.document.update({
        where: { id: existing.id },
        data: {
          url: params.opaqueId,
          verificationStatus: DOCUMENT_STATUSES.PENDING,
          motif: null,
        },
        select: { id: true },
      });
      savedDocumentId = updated.id;
    } else {
      const created = await tx.document.create({
        data: {
          registrationId: params.registrationId,
          type: params.type,
          url: params.opaqueId,
          verificationStatus: DOCUMENT_STATUSES.PENDING,
        },
        select: { id: true },
      });
      savedDocumentId = created.id;
    }

    const allDocs = await tx.document.findMany({
      where: { registrationId: params.registrationId },
      select: { type: true },
    });

    const hasAllFour = REQUIRED_DOCUMENT_TYPES.every((reqType) =>
      allDocs.some((d) => d.type === reqType)
    );

    if (
      hasAllFour &&
      canTransition(params.registrationStatus, REGISTRATION_STATUSES.DOCS_COMPLETE)
    ) {
      await tx.registration.update({
        where: { id: params.registrationId },
        data: { statut: REGISTRATION_STATUSES.DOCS_COMPLETE },
      });
    } else if (
      params.registrationStatus === REGISTRATION_STATUSES.PAID &&
      canTransition(params.registrationStatus, REGISTRATION_STATUSES.DOCS_INCOMPLETE)
    ) {
      await tx.registration.update({
        where: { id: params.registrationId },
        data: { statut: REGISTRATION_STATUSES.DOCS_INCOMPLETE },
      });
    }
  });

  return savedDocumentId;
}

/** Prépare un envoi (signature Cloudinary imposée ou mode Supabase) après contrôles. */
export async function prepareStudentDocumentUpload(params: {
  userId: string;
  type: DocumentType;
}): Promise<{
  signature: UploadSignatureResult;
  registrationId: string;
}> {
  const allowedRate = await checkDocumentUploadRateLimit(`upload:${params.userId}`);
  if (!allowedRate) {
    throw new Error("Trop de tentatives d'envoi. Réessayez dans une minute.");
  }

  const { registration } = await getActiveStudentRegistration(params.userId);
  const existingDoc = registration.documents.find((d) => d.type === params.type);

  if (
    !isDocumentUploadAllowed({
      registrationStatus: registration.statut as RegistrationStatus,
      docType: params.type,
      existingDocStatus: existingDoc?.verificationStatus as DocumentStatus | undefined,
    })
  ) {
    throw new Error(
      registration.statut === REGISTRATION_STATUSES.VALIDATED
        ? "Le dossier est validé : modification verrouillée."
        : "Vous devez d'abord régler les frais d'inscription (25 000 FCFA) avant de déposer cette pièce."
    );
  }

  const provider = getStorageProvider();
  const signature = provider.createUploadSignature({
    registrationId: registration.id,
    docType: params.type,
  });

  return { signature, registrationId: registration.id };
}

/** Vérifie auprès de Cloudinary que l'objet existe dans le bon dossier, puis enregistre en base. */
export async function confirmCloudinaryDocumentUpload(params: {
  userId: string;
  type: DocumentType;
  publicId: string;
  provider?: CloudinaryStorageProvider;
}) {
  const { registration } = await getActiveStudentRegistration(params.userId);
  const existingDoc = registration.documents.find((d) => d.type === params.type);

  if (
    !isDocumentUploadAllowed({
      registrationStatus: registration.statut as RegistrationStatus,
      docType: params.type,
      existingDocStatus: existingDoc?.verificationStatus as DocumentStatus | undefined,
    })
  ) {
    throw new Error("Envoi refusé pour le statut actuel du dossier.");
  }

  const expectedFolder = buildImposedDocumentFolder(registration.id, params.type);
  const cloudinary = params.provider ?? new CloudinaryStorageProvider();
  const normalizedOpaqueId = params.publicId.startsWith("cloudinary:")
    ? params.publicId
    : `cloudinary:${params.publicId}`;

  const verified = await cloudinary.verifyUploadedObject({
    opaqueId: normalizedOpaqueId,
    expectedFolder,
    docType: params.type,
  });

  if (existingDoc && existingDoc.url !== verified.opaqueId) {
    await resolveProviderForOpaqueId(existingDoc.url)
      .deleteObject(existingDoc.url)
      .catch(() => null);
  }

  const documentId = await upsertDocumentRecord({
    registrationId: registration.id,
    registrationStatus: registration.statut as RegistrationStatus,
    type: params.type,
    opaqueId: verified.opaqueId,
  });

  return { documentId, opaqueId: verified.opaqueId };
}

/** Téléverse une pièce justificative via Supabase Storage (repli/défaut) et met à jour le dossier. */
export async function uploadStudentDocument(params: {
  userId: string;
  type: DocumentType;
  file: File;
}) {
  const allowedRate = await checkDocumentUploadRateLimit(`upload:${params.userId}`);
  if (!allowedRate) {
    throw new Error("Trop de tentatives d'envoi. Réessayez dans une minute.");
  }

  if (
    !ALLOWED_DOCUMENT_MIME_TYPES.includes(
      params.file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
    )
  ) {
    throw new Error("Format non supporté. Formats acceptés : PDF, JPG, PNG ou WEBP.");
  }

  if (params.type === DOCUMENT_TYPES.PHOTO && params.file.type === "application/pdf") {
    throw new Error("La photo d'identité doit être une image (JPG, PNG ou WEBP).");
  }

  const maxAllowed =
    params.file.type === "application/pdf" ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
  if (params.file.size <= 0 || params.file.size > maxAllowed) {
    throw new Error(
      params.file.type === "application/pdf"
        ? "Le fichier PDF doit faire entre 1 octet et 4 Mo."
        : "Le fichier doit faire entre 1 octet et 5 Mo."
    );
  }

  const { registration } = await getActiveStudentRegistration(params.userId);
  const existingDoc = registration.documents.find((d) => d.type === params.type);

  if (
    !isDocumentUploadAllowed({
      registrationStatus: registration.statut as RegistrationStatus,
      docType: params.type,
      existingDocStatus: existingDoc?.verificationStatus as DocumentStatus | undefined,
    })
  ) {
    throw new Error(
      registration.statut === REGISTRATION_STATUSES.VALIDATED
        ? "Le dossier est validé : modification verrouillée."
        : "Vous devez d'abord régler les frais d'inscription (25 000 FCFA) avant de déposer vos pièces."
    );
  }

  const supabaseProvider = new SupabaseStorageProvider();
  const ext = extensionFromMime(params.file.type);
  const storagePath = `${params.userId}/${registration.id}/${params.type}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());

  await supabaseProvider.uploadBuffer({
    storagePath,
    buffer,
    contentType: params.file.type,
  });

  if (existingDoc && existingDoc.url !== storagePath) {
    await resolveProviderForOpaqueId(existingDoc.url)
      .deleteObject(existingDoc.url)
      .catch(() => null);
  }

  const documentId = await upsertDocumentRecord({
    registrationId: registration.id,
    registrationStatus: registration.statut as RegistrationStatus,
    type: params.type,
    opaqueId: storagePath,
  });

  return { documentId, opaqueId: storagePath };
}

/** Supprime une pièce justificative avant validation (propriétaire uniquement). */
export async function deleteStudentDocument(params: {
  userId: string;
  documentId: string;
}) {
  const doc = await prisma.document.findUnique({
    where: { id: params.documentId },
    select: {
      id: true,
      url: true,
      verificationStatus: true,
      registrationId: true,
      registration: {
        select: {
          statut: true,
          student: { select: { userId: true } },
        },
      },
    },
  });

  if (!doc) {
    throw new Error("Document introuvable.");
  }

  if (doc.registration.student.userId !== params.userId) {
    throw new Error("Accès refusé : ce document ne vous appartient pas.");
  }

  if (doc.registration.statut === REGISTRATION_STATUSES.VALIDATED) {
    throw new Error("Impossible de supprimer une pièce d'un dossier validé.");
  }

  if (doc.verificationStatus === DOCUMENT_STATUSES.APPROVED) {
    throw new Error("Impossible de supprimer une pièce déjà approuvée.");
  }

  await resolveProviderForOpaqueId(doc.url)
    .deleteObject(doc.url)
    .catch(() => null);

  await prisma.$transaction(async (tx) => {
    await tx.document.delete({ where: { id: doc.id } });
    if (
      doc.registration.statut === REGISTRATION_STATUSES.DOCS_COMPLETE &&
      canTransition(
        doc.registration.statut as RegistrationStatus,
        REGISTRATION_STATUSES.DOCS_INCOMPLETE
      )
    ) {
      await tx.registration.update({
        where: { id: doc.registrationId },
        data: { statut: REGISTRATION_STATUSES.DOCS_INCOMPLETE },
      });
    }
  });
}

/** Retourne une URL signée courte durée (5 à 10 min) pour consulter un document privé. */
export async function getSignedDocumentUrl(
  opaqueId: string,
  options: SignedReadOptions = {}
): Promise<string | null> {
  if (!opaqueId || opaqueId.startsWith("demo/")) return null;
  const provider = resolveProviderForOpaqueId(opaqueId);
  return provider.getSignedReadUrl(opaqueId, {
    expiresInSeconds: options.expiresInSeconds ?? 600,
    isPhoto: options.isPhoto ?? false,
  });
}

/** Vérifie les droits d'accès à un document et retourne son URL signée courte durée. */
export async function authorizeAndGetSignedDocumentUrl(params: {
  documentId: string;
  requesterId: string;
  requesterRole: Role;
  expiresInSeconds?: number;
  db?: typeof prisma;
}): Promise<{
  isDemo: boolean;
  url: string | null;
  type: DocumentType;
  fileName: string;
}> {
  const db = params.db ?? prisma;
  const doc = await db.document.findUnique({
    where: { id: params.documentId },
    select: {
      url: true,
      type: true,
      registration: {
        select: { student: { select: { userId: true } } },
      },
    },
  });

  if (!doc) {
    throw new Error("NOT_FOUND");
  }

  const isOwner = doc.registration.student.userId === params.requesterId;
  const isStaff =
    params.requesterRole === ROLES.AGENT || params.requesterRole === ROLES.ADMIN;

  if (!isOwner && !isStaff) {
    throw new Error("FORBIDDEN");
  }

  const fileName = doc.url.split("/").pop() ?? "document";
  if (doc.url.startsWith("demo/")) {
    return { isDemo: true, url: null, type: doc.type as DocumentType, fileName };
  }

  const url = await getSignedDocumentUrl(doc.url, {
    expiresInSeconds: params.expiresInSeconds ?? 600,
    isPhoto: doc.type === DOCUMENT_TYPES.PHOTO,
  });

  return { isDemo: false, url, type: doc.type as DocumentType, fileName };
}

/** Approuve ou rejette un document (AGENT ou ADMIN) et met à jour le statut du dossier. */
export async function reviewStudentDocument(params: {
  documentId: string;
  decision: "APPROVED" | "REJECTED";
  motif?: string;
  reviewerRole: Role;
  db?: typeof prisma;
  skipEmail?: boolean;
}) {
  const db = params.db ?? prisma;

  if (params.reviewerRole !== ROLES.AGENT && params.reviewerRole !== ROLES.ADMIN) {
    throw new Error("Action réservée aux agents et administrateurs.");
  }

  if (params.decision === "REJECTED" && (!params.motif || params.motif.trim().length < 3)) {
    throw new Error("Veuillez indiquer un motif de rejet (minimum 3 caractères).");
  }

  const doc = await db.document.findUnique({
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

  await db.document.update({
    where: { id: doc.id },
    data: {
      verificationStatus: params.decision,
      motif: params.decision === "REJECTED" ? params.motif?.trim() : null,
    },
  });

  const allDocs = await db.document.findMany({
    where: { registrationId: doc.registrationId },
  });

  const allRequiredApproved = REQUIRED_DOCUMENT_TYPES.every((reqType) =>
    allDocs.some(
      (d) => d.type === reqType && d.verificationStatus === DOCUMENT_STATUSES.APPROVED
    )
  );

  const currentRegStatus = doc.registration.statut as RegistrationStatus;
  if (
    params.decision === "REJECTED" &&
    canTransition(currentRegStatus, REGISTRATION_STATUSES.DOCS_INCOMPLETE)
  ) {
    await db.registration.update({
      where: { id: doc.registrationId },
      data: { statut: REGISTRATION_STATUSES.DOCS_INCOMPLETE },
    });
  } else if (
    allRequiredApproved &&
    canTransition(currentRegStatus, REGISTRATION_STATUSES.DOCS_COMPLETE)
  ) {
    await db.registration.update({
      where: { id: doc.registrationId },
      data: { statut: REGISTRATION_STATUSES.DOCS_COMPLETE },
    });
  } else if (
    !allRequiredApproved &&
    currentRegStatus === REGISTRATION_STATUSES.PAID &&
    canTransition(currentRegStatus, REGISTRATION_STATUSES.DOCS_INCOMPLETE)
  ) {
    await db.registration.update({
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

  await notifyUser(
    {
      userId: studentUser.id,
      email: studentUser.email,
      type: params.decision === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
      message,
      emailSubject:
        params.decision === "APPROVED"
          ? `Document approuvé : ${docLabel}`
          : `Action requise : document rejeté (${docLabel})`,
      emailHtml: `<p>Bonjour ${studentUser.prenom},</p><p>${message}</p>`,
    },
    { db, skipEmail: params.skipEmail }
  );
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
