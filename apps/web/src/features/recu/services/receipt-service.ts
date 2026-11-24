import crypto from "node:crypto";
import QRCode from "qrcode";

/** Génère un jeton QR aléatoire non devinable (32 octets cryptographiques en base64url). */
export function generateQrToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Formate un numéro de reçu séquentiel unique au format REC-YYYY-000123. */
export function formatReceiptNumber(sequenceValue: number | bigint, year?: number): string {
  const targetYear = year ?? new Date().getFullYear();
  const padded = String(sequenceValue).padStart(6, "0");
  return `REC-${targetYear}-${padded}`;
}

/** Construit l'URL de vérification encodée dans le QR code (aucune donnée personnelle). */
export function buildVerificationUrl(qrToken: string): string {
  const baseUrl =
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}/verification/${qrToken}`;
}

/** Génère une image Data URL PNG du QR code pour affichage dans l'interface web. */
export async function generateQrDataUrl(qrToken: string): Promise<string> {
  const verificationUrl = buildVerificationUrl(qrToken);
  return QRCode.toDataURL(verificationUrl, {
    width: 240,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
