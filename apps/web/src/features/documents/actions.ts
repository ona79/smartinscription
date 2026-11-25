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

export interface DocumentActionState {
  error?: string;
  success?: string;
  documentId?: string;
}

const docTypeValues = Object.values(DOCUMENT_TYPES) as [DocumentType, ...DocumentType[]];

const uploadMetaSchema = z.object({
  type: z.enum(docTypeValues, {
    message: "Type de document invalide.",
  }),
});

const confirmCloudinarySchema = z.object({
  type: z.enum(docTypeValues, { message: "Type de document invalide." }),
  publicId: z.string().trim().min(1, "Identifiant Cloudinary manquant."),
});

function revalidateDocumentViews() {
  revalidatePath("/etudiant");
  revalidatePath("/etudiant/dossier");
  revalidatePath("/etudiant/documents");
  revalidatePath("/agent");
  revalidatePath("/admin/dossiers");
}

/** Action étudiant : génère une signature Cloudinary imposée (ou confirme le mode Supabase). */
export async function prepareDocumentUploadAction(type: DocumentType): Promise<{
  ok: boolean;
  error?: string;
  signature?: UploadSignatureResult;
}> {
  const user = await requireRole([ROLES.STUDENT]);
  const parsed = uploadMetaSchema.safeParse({ type });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Type invalide." };
  }

  try {
    const { signature } = await prepareStudentDocumentUpload({
      userId: user.id,
      type: parsed.data.type,
    });
    return { ok: true, signature };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible d'initialiser le téléversement.",
    };
  }
}

/** Action étudiant : vérifie l'objet Cloudinary envoyé et l'enregistre en base. */
export async function confirmCloudinaryUploadAction(input: {
  type: DocumentType;
  publicId: string;
}): Promise<DocumentActionState> {
  const user = await requireRole([ROLES.STUDENT]);
  const parsed = confirmCloudinarySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Paramètres invalides." };
  }

  try {
    const { documentId } = await confirmCloudinaryDocumentUpload({
      userId: user.id,
      type: parsed.data.type,
      publicId: parsed.data.publicId,
    });
    revalidateDocumentViews();
    return { success: "Document enregistré avec succès.", documentId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Échec de vérification du fichier sur Cloudinary.",
    };
  }
}

/** Action étudiant : téléverse une pièce justificative (mode Supabase). */
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
    const { documentId } = await uploadStudentDocument({
      userId: user.id,
      type: parsed.data.type,
      file,
    });
    revalidateDocumentViews();
    return { success: "Document téléversé avec succès.", documentId };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Erreur lors du téléversement.",
    };
  }
}

/** Action étudiant : supprime une pièce justificative avant validation. */
export async function deleteDocumentAction(
  documentId: string
): Promise<DocumentActionState> {
  const user = await requireRole([ROLES.STUDENT]);
  if (!documentId) {
    return { error: "Identifiant de document manquant." };
  }

  try {
    await deleteStudentDocument({ userId: user.id, documentId });
    revalidateDocumentViews();
    return { success: "Pièce supprimée." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Impossible de supprimer la pièce.",
    };
  }
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
  revalidateDocumentViews();
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
  revalidateDocumentViews();
  revalidatePath("/admin");
}
