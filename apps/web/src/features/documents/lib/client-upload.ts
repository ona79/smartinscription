"use client";

import { DOCUMENT_TYPES, type DocumentType } from "@smartinscription/shared";
import {
  confirmCloudinaryUploadAction,
  prepareDocumentUploadAction,
  uploadDocumentAction,
} from "@/features/documents/actions";
import { compressPhotoFile } from "@/features/documents/lib/compress-image";
import type { ActionResult } from "@/lib/action-result";
import { MESSAGES } from "@/lib/messages";

export interface UploadProgressOptions {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

function uploadViaXhr(
  url: string,
  formData: FormData,
  options: UploadProgressOptions = {}
): Promise<{ status: number; json: { public_id?: string; error?: { message?: string } } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    if (options.signal) {
      if (options.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const onAbort = () => xhr.abort();
      options.signal.addEventListener("abort", onAbort, { once: true });
      xhr.addEventListener("loadend", () => {
        options.signal?.removeEventListener("abort", onAbort);
      });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onProgress) {
        const pct = Math.min(95, Math.max(5, Math.round((event.loaded / event.total) * 90)));
        options.onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}") as {
          public_id?: string;
          error?: { message?: string };
        };
        resolve({ status: xhr.status, json });
      } catch {
        resolve({ status: xhr.status, json: {} });
      }
    };

    xhr.onerror = () => reject(new Error("NETWORK_ERROR"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    xhr.send(formData);
  });
}

/**
 * Envoie un document via le fournisseur actif (direct navigateur -> Cloudinary signé,
 * ou Server Action -> Supabase Storage). Compresse les images et suit la progression.
 */
export async function uploadDocumentViaActiveStorage(
  type: DocumentType,
  rawFile: File,
  options: UploadProgressOptions = {}
): Promise<ActionResult<{ documentId: string }>> {
  const isPhoto = type === DOCUMENT_TYPES.PHOTO;
  const isImage = rawFile.type.startsWith("image/");

  let file: File;
  try {
    file = isPhoto || isImage ? await compressPhotoFile(rawFile) : rawFile;
  } catch {
    return {
      ok: false,
      error: isPhoto ? MESSAGES.photo.unreadable : MESSAGES.documents.invalidFormat,
    };
  }

  const isPdf = file.type === "application/pdf";
  const maxAllowed = isPdf ? 4 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxAllowed) {
    return {
      ok: false,
      error: isPdf
        ? MESSAGES.documents.pdfTooLarge
        : isPhoto
          ? MESSAGES.photo.tooLarge
          : MESSAGES.documents.tooLarge,
    };
  }

  if (options.signal?.aborted) {
    return {
      ok: false,
      error: isPhoto ? MESSAGES.photo.cancelled : MESSAGES.documents.cancelled,
    };
  }

  options.onProgress?.(10);

  let prep: Awaited<ReturnType<typeof prepareDocumentUploadAction>>;
  try {
    prep = await prepareDocumentUploadAction(type);
  } catch {
    return {
      ok: false,
      error: isPhoto ? MESSAGES.photo.network : MESSAGES.documents.network,
    };
  }

  if (!prep.ok || !prep.data) {
    return {
      ok: false,
      error: prep.ok ? MESSAGES.generic.unexpected : prep.error,
    };
  }

  const signature = prep.data;

  if (signature.provider === "cloudinary") {
    const formData = new FormData();
    Object.entries(signature.fields).forEach(([k, v]) => {
      formData.append(k, v);
    });
    formData.append("file", file);

    let publicId = "";
    try {
      const { status, json } = await uploadViaXhr(signature.uploadUrl, formData, options);
      if (status < 200 || status >= 300 || !json.public_id) {
        return {
          ok: false,
          error: isPhoto
            ? MESSAGES.photo.providerFailed
            : MESSAGES.documents.providerFailed,
        };
      }
      publicId = json.public_id;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          ok: false,
          error: isPhoto ? MESSAGES.photo.cancelled : MESSAGES.documents.cancelled,
        };
      }
      return {
        ok: false,
        error: isPhoto ? MESSAGES.photo.network : MESSAGES.documents.network,
      };
    }

    options.onProgress?.(96);
    try {
      const confirmed = await confirmCloudinaryUploadAction({ type, publicId });
      if (!confirmed.ok) {
        return { ok: false, error: confirmed.error };
      }
      options.onProgress?.(100);
      return {
        ok: true,
        message: isPhoto ? MESSAGES.photo.success : MESSAGES.documents.uploadSuccess,
        data: confirmed.data,
      };
    } catch {
      return {
        ok: false,
        error: isPhoto ? MESSAGES.photo.network : MESSAGES.documents.network,
      };
    }
  }

  // Mode Supabase Storage
  options.onProgress?.(40);
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);
  try {
    const res = await uploadDocumentAction(null, formData);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    options.onProgress?.(100);
    return {
      ok: true,
      message: isPhoto ? MESSAGES.photo.success : MESSAGES.documents.uploadSuccess,
      data: res.data,
    };
  } catch {
    return {
      ok: false,
      error: isPhoto ? MESSAGES.photo.network : MESSAGES.documents.network,
    };
  }
}
