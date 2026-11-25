import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { ROLES, type Role } from "@smartinscription/shared";
import { recordActivity } from "@/features/activity/record-activity";
import { prisma } from "@/lib/prisma";

const SIGNATURE_LENGTH = 22;
const CHECK_IN_COOLDOWN_MS = 30 * 60_000;
const DEV_FALLBACK_SECRET = "dev-only-card-qr-secret-32-bytes-min";

/** Résout `CARD_QR_SECRET` (obligatoire en production, minimum 32 caractères). */
export function resolveCardQrSecret(
  env: Record<string, string | undefined> = process.env
): string {
  const secret = env.CARD_QR_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("CARD_QR_SECRET manquant ou trop court (32 caractères minimum).");
  }
  return DEV_FALLBACK_SECRET;
}

/** Calcule la signature HMAC-SHA256 tronquée à 22 caractères base64url. */
export function signCardQr(
  studentId: string,
  version: number,
  secret: string = resolveCardQrSecret()
): string {
  const message = `card:v${version}:${studentId}`;
  return createHmac("sha256", secret)
    .update(message)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

/** Construit l'URL encodée dans le QR code d'identité du verso de la carte. */
export function buildCardQrPayload(params: {
  studentId: string;
  version: number;
  appUrl?: string;
  secret?: string;
}): string {
  const baseUrl = (
    params.appUrl ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://smartinscription-apps.vercel.app"
  ).replace(/\/$/, "");
  const sig = signCardQr(params.studentId, params.version, params.secret);
  return `${baseUrl}/verification/carte/${params.studentId}.${sig}`;
}

/** Extrait `<studentId>.<signature>` depuis une URL `/verification/carte/...` ou une chaîne brute. */
export function extractCardQrCode(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return "";

  const marker = "/verification/carte/";
  const idx = trimmed.indexOf(marker);
  if (idx !== -1) {
    const tail = trimmed.slice(idx + marker.length);
    return tail.split(/[?#]/)[0]?.trim() ?? "";
  }

  return trimmed;
}

/** Indique si une chaîne ressemble à un code QR de carte d'identité (`<id>.<22-chars>`). */
export function isCardQrInput(rawInput: string): boolean {
  const trimmed = rawInput.trim();
  if (trimmed.includes("/verification/carte/")) return true;
  const parts = trimmed.split(".");
  return (
    parts.length === 2 &&
    parts[0].length >= 4 &&
    /^[A-Za-z0-9_-]{22}$/.test(parts[1])
  );
}

/** Vérifie la structure et la signature HMAC en temps constant. */
export function verifyCardQrCode(params: {
  code: string;
  expectedVersion: number;
  secret?: string;
}): { valid: boolean; studentId?: string } {
  const extracted = extractCardQrCode(params.code);
  const dotIdx = extracted.lastIndexOf(".");
  if (dotIdx <= 0) return { valid: false };

  const studentId = extracted.slice(0, dotIdx);
  const providedSig = extracted.slice(dotIdx + 1);
  if (providedSig.length !== SIGNATURE_LENGTH) return { valid: false };

  const expectedSig = signCardQr(studentId, params.expectedVersion, params.secret);
  const bufA = Buffer.from(providedSig, "utf8");
  const bufB = Buffer.from(expectedSig, "utf8");
  if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
    return { valid: false };
  }

  return { valid: true, studentId };
}

/** Génère le SVG du QR code d'identité (correction d'erreur M, marge 4 modules, noir sur blanc). */
export async function renderCardQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Enregistre CHECK_IN dans ActivityLog au plus une fois toutes les 30 minutes par étudiant.
 */
export async function recordCardCheckIn(
  params: { studentUserId: string; registrationId?: string | null; now?: Date },
  db: typeof prisma = prisma
): Promise<boolean> {
  const now = params.now ?? new Date();
  const windowStart = new Date(now.getTime() - CHECK_IN_COOLDOWN_MS);

  const recent = await db.activityLog.findFirst({
    where: {
      userId: params.studentUserId,
      type: "CHECK_IN",
      createdAt: { gte: windowStart },
    },
    select: { id: true },
  });

  if (recent) {
    return false;
  }

  await recordActivity(
    "CHECK_IN",
    params.studentUserId,
    params.registrationId ? { registrationId: params.registrationId } : {},
    { db }
  );
  return true;
}

/** Vérifie un code QR de carte d'identité contre la base (AGENT / ADMIN uniquement). */
export async function verifyCardQrInDb(
  params: {
    rawCode: string;
    requesterRole: Role;
    secret?: string;
  },
  db: typeof prisma = prisma
): Promise<{ valid: true; studentId: string } | { valid: false; reason: "FORBIDDEN" | "INVALID" }> {
  if (params.requesterRole !== ROLES.AGENT && params.requesterRole !== ROLES.ADMIN) {
    return { valid: false, reason: "FORBIDDEN" };
  }

  const extracted = extractCardQrCode(params.rawCode);
  const dotIdx = extracted.lastIndexOf(".");
  if (dotIdx <= 0) {
    console.warn("[carte-qr] Tentative de vérification avec format invalide");
    return { valid: false, reason: "INVALID" };
  }

  const studentId = extracted.slice(0, dotIdx);
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { id: true, cardQrVersion: true },
  });

  if (!student) {
    console.warn("[carte-qr] Tentative de vérification pour carte inconnue");
    return { valid: false, reason: "INVALID" };
  }

  const check = verifyCardQrCode({
    code: extracted,
    expectedVersion: student.cardQrVersion,
    secret: params.secret,
  });

  if (!check.valid) {
    console.warn("[carte-qr] Signature QR invalide ou révoquée");
    return { valid: false, reason: "INVALID" };
  }

  return { valid: true, studentId: student.id };
}
