"use server";

import { DOCUMENT_TYPES, ROLES, type DocumentType } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/features/auth/lib/session";
import {
  finalizeRegistration,
  reviewStudentDocument,
  uploadStudentDocument,
} from "@/features/documents/services/document-service";

export interface DocumentActionState {
  error?: string;
  success?: string;
}

const docTypeValues = Object.values(DOCUMENT_TYPES) as [DocumentType, ...DocumentType[]];

const uploadMetaSchema = z.object({
  type: z.enum(docTypeValues, {
    message: "Type de document invalide.",
  }),
});

/** Action étudiant : téléverse une pièce justificative. */
export async function uploadDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = uploadMetaSchema.safeParse({
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Type invalide." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Veuillez sélectionner un fichier à téléverser." };
  }

  try {
    await uploadStudentDocument({
      userId: user.id,
      type: parsed.data.type,
      file,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Erreur lors du téléversement.",
    };
  }

  revalidatePath("/etudiant");
  revalidatePath("/etudiant/documents");
  return { success: "Document téléversé avec succès." };
}

/** Action agent/admin : approuve ou rejette un document. */
export async function reviewDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
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
    return {
      error:
        error instanceof Error ? error.message : "Erreur lors de la vérification.",
    };
  }

  revalidatePath(`/agent/dossiers/${registrationId}`);
  revalidatePath("/agent");
  revalidatePath("/etudiant");
  revalidatePath("/etudiant/documents");
  return {
    success:
      decision === "APPROVED" ? "Document approuvé." : "Document rejeté.",
  };
}

/** Action agent/admin : valide ou rejette définitivement une inscription. */
export async function finalizeRegistrationAction(formData: FormData): Promise<void> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);

  const registrationId = String(formData.get("registrationId") ?? "");
  const decision = formData.get("decision") === "VALIDATED" ? "VALIDATED" : "REJECTED";

  await finalizeRegistration({
    registrationId,
    decision,
    reviewerRole: user.role,
  });

  revalidatePath(`/agent/dossiers/${registrationId}`);
  revalidatePath("/agent");
  revalidatePath("/etudiant");
  revalidatePath("/admin");
}
