"use server";

import { DOCUMENT_TYPES, ROLES, type DocumentType } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/features/auth/lib/session";
import {
  confirmCloudinaryDocumentUpload,
  deleteStudentDocument,
  finalizeRegistration,
  prepareStudentDocumentUpload,
  reviewStudentDocument,
  uploadStudentDocument,
} from "@/features/documents/services/document-service";
import type { UploadSignatureResult } from "@/features/documents/services/storage-provider";
import {
  actionError,
  actionOk,
  actionValidationError,
  type ActionResult,
} from "@/lib/action-result";
import { toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";

export type DocumentActionState = ActionResult<{ documentId?: string }>;

const docTypeValues = Object.values(DOCUMENT_TYPES) as [DocumentType, ...DocumentType[]];

const uploadMetaSchema = z.object({
  type: z.enum(docTypeValues, {
    message: MESSAGES.documents.invalidFormat,
  }),
});

const confirmCloudinarySchema = z.object({
  type: z.enum(docTypeValues, { message: MESSAGES.documents.invalidFormat }),
  publicId: z.string().trim().min(1, MESSAGES.documents.verificationFailed),
});

function revalidateDocumentViews() {
  revalidatePath("/etudiant");
  revalidatePath("/etudiant/dossier");
  revalidatePath("/etudiant/documents");
  revalidatePath("/agent");
  revalidatePath("/admin/dossiers");
}

/** Action étudiant : génère une signature Cloudinary imposée (ou confirme le mode Supabase). */
export async function prepareDocumentUploadAction(
  type: DocumentType
): Promise<ActionResult<UploadSignatureResult>> {
  const user = await requireRole([ROLES.STUDENT]);
  const parsed = uploadMetaSchema.safeParse({ type });
  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  try {
    const { signature } = await prepareStudentDocumentUpload({
      userId: user.id,
      type: parsed.data.type,
    });
    return actionOk(undefined, signature);
  } catch (error) {
    return toActionError(error, "documents.prepareUpload");
  }
}

/** Action étudiant : vérifie l'objet Cloudinary envoyé et l'enregistre en base. */
export async function confirmCloudinaryUploadAction(input: {
  type: DocumentType;
  publicId: string;
}): Promise<ActionResult<{ documentId: string }>> {
  const user = await requireRole([ROLES.STUDENT]);
  const parsed = confirmCloudinarySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  try {
    const { documentId } = await confirmCloudinaryDocumentUpload({
      userId: user.id,
      type: parsed.data.type,
      publicId: parsed.data.publicId,
    });
    revalidateDocumentViews();
    const message =
      parsed.data.type === DOCUMENT_TYPES.PHOTO
        ? MESSAGES.photo.success
        : MESSAGES.documents.uploadSuccess;
    return actionOk(message, { documentId });
  } catch (error) {
    return toActionError(error, "documents.confirmCloudinary");
  }
}

/** Action étudiant : téléverse une pièce justificative (mode Supabase). */
export async function uploadDocumentAction(
  _prevState: ActionResult<{ documentId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ documentId: string }>> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = uploadMetaSchema.safeParse({
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionError(MESSAGES.documents.empty);
  }

  try {
    const { documentId } = await uploadStudentDocument({
      userId: user.id,
      type: parsed.data.type,
      file,
    });
    revalidateDocumentViews();
    const message =
      parsed.data.type === DOCUMENT_TYPES.PHOTO
        ? MESSAGES.photo.success
        : MESSAGES.documents.uploadSuccess;
    return actionOk(message, { documentId });
  } catch (error) {
    return toActionError(error, "documents.upload");
  }
}

/** Action étudiant : supprime une pièce justificative avant validation. */
export async function deleteDocumentAction(
  documentId: string
): Promise<ActionResult> {
  const user = await requireRole([ROLES.STUDENT]);
  if (!documentId) {
    return actionError(MESSAGES.documents.notFound);
  }

  try {
    await deleteStudentDocument({ userId: user.id, documentId });
    revalidateDocumentViews();
    return actionOk(MESSAGES.documents.deleteSuccess);
  } catch (error) {
    return toActionError(error, "documents.delete");
  }
}

/** Action agent/admin : approuve ou rejette un document. */
export async function reviewDocumentAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);

  const documentId = String(formData.get("documentId") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const decision = formData.get("decision") === "APPROVED" ? "APPROVED" : "REJECTED";
  const motif = String(formData.get("motif") ?? "");

  try {
    await reviewStudentDocument({
      documentId,
      decision,
      motif,
      reviewerRole: user.role,
    });
  } catch (error) {
    return toActionError(error, "documents.review");
  }

  revalidatePath(`/agent/dossiers/${registrationId}`);
  revalidateDocumentViews();
  return actionOk(
    decision === "APPROVED" ? MESSAGES.documents.approved : MESSAGES.documents.rejected
  );
}

/** Action agent/admin : valide ou rejette définitivement une inscription. */
export async function finalizeRegistrationAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);

  const registrationId = String(formData.get("registrationId") ?? "");
  const decision = formData.get("decision") === "VALIDATED" ? "VALIDATED" : "REJECTED";

  try {
    await finalizeRegistration({
      registrationId,
      decision,
      reviewerRole: user.role,
    });
  } catch (error) {
    return toActionError(error, "documents.finalize");
  }

  revalidatePath(`/agent/dossiers/${registrationId}`);
  revalidateDocumentViews();
  revalidatePath("/admin");
  return actionOk(
    decision === "VALIDATED"
      ? MESSAGES.documents.registrationValidated
      : MESSAGES.documents.registrationRejected
  );
}
