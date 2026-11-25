"use client";

import { DOCUMENT_TYPES, type DocumentType } from "@smartinscription/shared";
import {
  confirmCloudinaryUploadAction,
  prepareDocumentUploadAction,
  uploadDocumentAction,
} from "@/features/documents/actions";
import { compressPhotoFile } from "@/features/documents/lib/compress-image";

/**
 * Envoie un document via le fournisseur actif (direct navigateur -> Cloudinary signé,
 * ou Server Action -> Supabase Storage). Compresse automatiquement les photos.
 */
export async function uploadDocumentViaActiveStorage(
  type: DocumentType,
  rawFile: File
): Promise<{ ok: boolean; error?: string; documentId?: string }> {
  const isImage = rawFile.type.startsWith("image/");
  const file =
    type === DOCUMENT_TYPES.PHOTO || isImage
      ? await compressPhotoFile(rawFile)
      : rawFile;

  const isPdf = file.type === "application/pdf";
  const maxAllowed = isPdf ? 4 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxAllowed) {
    return {
      ok: false,
      error: isPdf
        ? "Le fichier PDF ne doit pas dépasser 4 Mo."
        : "Le fichier ne doit pas dépasser 5 Mo.",
    };
  }

  const prep = await prepareDocumentUploadAction(type);
  if (!prep.ok || !prep.signature) {
    return { ok: false, error: prep.error ?? "Impossible de préparer l'envoi." };
  }

  if (prep.signature.provider === "cloudinary") {
    const formData = new FormData();
    Object.entries(prep.signature.fields).forEach(([k, v]) => {
      formData.append(k, v);
    });
    formData.append("file", file);

    let publicId = "";
    try {
      const uploadRes = await fetch(prep.signature.uploadUrl, {
        method: "POST",
        body: formData,
      });
      const json = (await uploadRes.json()) as {
        public_id?: string;
        error?: { message?: string };
      };
      if (!uploadRes.ok || !json.public_id) {
        return {
          ok: false,
          error:
            json.error?.message ?? "Échec du téléversement direct vers Cloudinary.",
        };
      }
      publicId = json.public_id;
    } catch {
      return {
        ok: false,
        error: "Erreur réseau lors du téléversement vers Cloudinary.",
      };
    }

    const confirmed = await confirmCloudinaryUploadAction({ type, publicId });
    if (confirmed.error) {
      return { ok: false, error: confirmed.error };
    }
    return { ok: true, documentId: confirmed.documentId };
  }

  // Mode Supabase Storage
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);
  const res = await uploadDocumentAction({}, formData);
  if (res.error) {
    return { ok: false, error: res.error };
  }
  return { ok: true, documentId: res.documentId };
}
