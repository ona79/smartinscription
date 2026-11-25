import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DOCUMENT_TYPES, type DocumentType } from "@smartinscription/shared";

export type StorageProviderName = "supabase" | "cloudinary";

export const DOCUMENTS_BUCKET = "documents";
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
export const MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024; // 4 Mo
export const ALLOWED_UPLOAD_FORMATS = ["jpg", "png", "webp", "pdf"] as const;
export const ALLOWED_PHOTO_FORMATS = ["jpg", "png", "webp"] as const;
export const PHOTO_DELIVERY_TRANSFORMATION = "c_thumb,g_face,z_0.75,w_360,h_480,f_auto,q_auto";

export interface UploadSignatureResult {
  provider: StorageProviderName;
  uploadUrl: string;
  folder: string;
  fields: Record<string, string>;
  maxBytes: number;
  maxPdfBytes: number;
  allowedFormats: readonly string[];
}

export interface VerifiedUploadResult {
  opaqueId: string;
  format: string;
  bytes: number;
  folder: string;
}

export interface SignedReadOptions {
  expiresInSeconds?: number;
  isPhoto?: boolean;
}

export interface StorageProvider {
  readonly name: StorageProviderName;
  createUploadSignature(params: {
    registrationId: string;
    docType: DocumentType;
  }): UploadSignatureResult;
  verifyUploadedObject(params: {
    opaqueId: string;
    expectedFolder: string;
    docType: DocumentType;
  }): Promise<VerifiedUploadResult>;
  getSignedReadUrl(
    opaqueId: string,
    options?: SignedReadOptions
  ): Promise<string | null>;
  deleteObject(opaqueId: string): Promise<void>;
}

/** Construit le chemin de dossier imposé côté serveur pour un document. */
export function buildImposedDocumentFolder(
  registrationId: string,
  docType: DocumentType
): string {
  return `smartinscription/${registrationId}/${docType}`;
}

/** Borne la durée d'expiration des URL signées entre 5 et 10 minutes (300..600 s). */
export function clampSignedUrlTtl(expiresInSeconds?: number): number {
  const raw = expiresInSeconds ?? 600;
  return Math.min(600, Math.max(300, Math.round(raw)));
}

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

/** Implémentation Supabase Storage (buckets privés existants). */
export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase" as const;

  createUploadSignature(params: {
    registrationId: string;
    docType: DocumentType;
  }): UploadSignatureResult {
    const folder = buildImposedDocumentFolder(params.registrationId, params.docType);
    const allowedFormats =
      params.docType === DOCUMENT_TYPES.PHOTO
        ? ALLOWED_PHOTO_FORMATS
        : ALLOWED_UPLOAD_FORMATS;

    return {
      provider: "supabase",
      uploadUrl: "",
      folder,
      fields: {},
      maxBytes: MAX_IMAGE_SIZE_BYTES,
      maxPdfBytes: MAX_PDF_SIZE_BYTES,
      allowedFormats,
    };
  }

  async verifyUploadedObject(params: {
    opaqueId: string;
    expectedFolder: string;
    docType: DocumentType;
  }): Promise<VerifiedUploadResult> {
    if (!params.opaqueId) {
      throw new Error("Identifiant de fichier manquant.");
    }
    const ext = params.opaqueId.split(".").pop()?.toLowerCase() ?? "bin";
    return {
      opaqueId: params.opaqueId,
      format: ext,
      bytes: 0,
      folder: params.expectedFolder,
    };
  }

  async uploadBuffer(params: {
    storagePath: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<string> {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error("Stockage Supabase non configuré.");
    }

    await supabase.storage
      .createBucket(DOCUMENTS_BUCKET, { public: false })
      .catch(() => null);

    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(params.storagePath, params.buffer, {
        contentType: params.contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Échec du téléversement : ${error.message}`);
    }

    return params.storagePath;
  }

  async getSignedReadUrl(
    opaqueId: string,
    options: SignedReadOptions = {}
  ): Promise<string | null> {
    const supabase = getSupabaseAdminClient();
    if (!supabase) return null;

    const ttl = clampSignedUrlTtl(options.expiresInSeconds);
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(opaqueId, ttl);

    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  }

  async deleteObject(opaqueId: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    if (!supabase || !opaqueId || opaqueId.startsWith("demo/")) return;
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([opaqueId]);
  }
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function getCloudinaryConfig(
  env: Record<string, string | undefined> = process.env
): CloudinaryConfig {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Configuration Cloudinary incomplète (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)."
    );
  }

  return { cloudName, apiKey, apiSecret };
}

/** Calcule la signature SHA-1 officielle pour l'API Upload Cloudinary. */
export function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const serialized = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

/** Génère la signature s--<8 chars>-- pour une URL de livraison Cloudinary signée. */
export function buildCloudinaryDeliverySignature(
  toSign: string,
  apiSecret: string
): string {
  const digest = createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `s--${digest.slice(0, 8)}--`;
}

/** Implémentation Cloudinary sécurisée (type: authenticated, dossier imposé, URL signées). */
export class CloudinaryStorageProvider implements StorageProvider {
  readonly name = "cloudinary" as const;

  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  createUploadSignature(params: {
    registrationId: string;
    docType: DocumentType;
  }): UploadSignatureResult {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(this.env);
    const folder = buildImposedDocumentFolder(params.registrationId, params.docType);
    const timestamp = Math.floor(Date.now() / 1000);
    const allowedFormats =
      params.docType === DOCUMENT_TYPES.PHOTO
        ? ALLOWED_PHOTO_FORMATS
        : ALLOWED_UPLOAD_FORMATS;

    const signedFields: Record<string, string> = {
      allowed_formats: allowedFormats.join(","),
      folder,
      timestamp: String(timestamp),
      type: "authenticated",
    };

    const signature = signCloudinaryParams(signedFields, apiSecret);

    return {
      provider: "cloudinary",
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      folder,
      fields: {
        ...signedFields,
        api_key: apiKey,
        signature,
      },
      maxBytes: MAX_IMAGE_SIZE_BYTES,
      maxPdfBytes: MAX_PDF_SIZE_BYTES,
      allowedFormats,
    };
  }

  async verifyUploadedObject(params: {
    opaqueId: string;
    expectedFolder: string;
    docType: DocumentType;
  }): Promise<VerifiedUploadResult> {
    if (!params.opaqueId.startsWith("cloudinary:")) {
      throw new Error("Identifiant Cloudinary invalide.");
    }

    const publicId = params.opaqueId.slice("cloudinary:".length).trim();
    if (!publicId.startsWith(`${params.expectedFolder}/`)) {
      throw new Error(
        `Objet refusé : dossier invalide (attendu : ${params.expectedFolder}).`
      );
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(this.env);
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;

    const resourceTypes =
      params.docType === DOCUMENT_TYPES.PHOTO ? ["image"] : ["image", "raw"];

    let asset: {
      public_id: string;
      type: string;
      format?: string;
      bytes: number;
      resource_type: string;
    } | null = null;

    for (const rType of resourceTypes) {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${rType}/authenticated/${encodeURIComponent(publicId)}`;
      const res = await fetch(url, {
        headers: { Authorization: authHeader },
        cache: "no-store",
      });
      if (res.ok) {
        asset = (await res.json()) as {
          public_id: string;
          type: string;
          format?: string;
          bytes: number;
          resource_type: string;
        };
        break;
      }
    }

    if (!asset) {
      throw new Error("Objet introuvable sur Cloudinary.");
    }

    if (!asset.public_id.startsWith(`${params.expectedFolder}/`)) {
      throw new Error("Objet hors du dossier imposé par le serveur.");
    }

    if (asset.type !== "authenticated") {
      throw new Error("Type d'accès Cloudinary non autorisé (authenticated requis).");
    }

    const format = (asset.format ?? publicId.split(".").pop() ?? "").toLowerCase();
    const allowedFormats: readonly string[] =
      params.docType === DOCUMENT_TYPES.PHOTO
        ? ALLOWED_PHOTO_FORMATS
        : [...ALLOWED_UPLOAD_FORMATS, "jpeg"];

    if (!allowedFormats.includes(format)) {
      throw new Error(`Format de fichier non autorisé (${format}).`);
    }

    const maxAllowed = format === "pdf" ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (asset.bytes <= 0 || asset.bytes > maxAllowed) {
      throw new Error(
        format === "pdf"
          ? "Le fichier PDF dépasse la taille maximale de 4 Mo."
          : "Le fichier dépasse la taille maximale de 5 Mo."
      );
    }

    return {
      opaqueId: `cloudinary:${asset.public_id}`,
      format,
      bytes: asset.bytes,
      folder: params.expectedFolder,
    };
  }

  async getSignedReadUrl(
    opaqueId: string,
    options: SignedReadOptions = {}
  ): Promise<string | null> {
    if (!opaqueId.startsWith("cloudinary:")) {
      return null;
    }

    const { cloudName, apiSecret } = getCloudinaryConfig(this.env);
    const publicId = opaqueId.slice("cloudinary:".length);
    const ttl = clampSignedUrlTtl(options.expiresInSeconds);
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const transformation = options.isPhoto ? PHOTO_DELIVERY_TRANSFORMATION : "";

    const pathToSign = transformation
      ? `${transformation}/${publicId}`
      : publicId;
    const signature = buildCloudinaryDeliverySignature(pathToSign, apiSecret);

    const segments = [
      `https://res.cloudinary.com/${cloudName}/image/authenticated`,
      signature,
      ...(transformation ? [transformation] : []),
      publicId,
    ];

    return `${segments.join("/")}?exp=${expiresAt}`;
  }

  async deleteObject(opaqueId: string): Promise<void> {
    if (!opaqueId.startsWith("cloudinary:")) return;
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(this.env);
    const publicId = opaqueId.slice("cloudinary:".length);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams(
      { public_id: publicId, timestamp, type: "authenticated" },
      apiSecret
    );

    const form = new URLSearchParams({
      public_id: publicId,
      type: "authenticated",
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
    });

    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: form,
    }).catch(() => null);
  }
}

export function getActiveStorageProviderName(
  env: Record<string, string | undefined> = process.env
): StorageProviderName {
  return env.STORAGE_PROVIDER === "cloudinary" ? "cloudinary" : "supabase";
}

export function getStorageProvider(
  providerOverride?: StorageProviderName,
  env: Record<string, string | undefined> = process.env
): StorageProvider {
  const name = providerOverride ?? getActiveStorageProviderName(env);
  if (name === "cloudinary") {
    return new CloudinaryStorageProvider(env);
  }
  return new SupabaseStorageProvider();
}

export function resolveProviderForOpaqueId(
  opaqueId: string,
  env: Record<string, string | undefined> = process.env
): StorageProvider {
  if (opaqueId.startsWith("cloudinary:")) {
    return new CloudinaryStorageProvider(env);
  }
  return new SupabaseStorageProvider();
}
