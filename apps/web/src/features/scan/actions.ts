"use server";

import { ROLES } from "@smartinscription/shared";
import { requireRole } from "@/features/auth/lib/session";
import {
  extractCardQrCode,
  isCardQrInput,
  verifyCardQrInDb,
} from "@/features/carte-qr/services/card-qr-service";
import {
  checkVerificationRateLimit,
  verifyReceiptByQrToken,
  type VerificationResult,
} from "@/features/scan/services/verification-service";
import { MESSAGES } from "@/lib/messages";

export type UnifiedScanResult =
  | { kind: "card"; valid: true; code: string; redirectUrl: string }
  | { kind: "card"; valid: false; error: string }
  | ({ kind: "receipt" } & VerificationResult);

/**
 * Server Action unifiée du scanner agent (AGENT ou ADMIN uniquement) :
 * reconnaît les QR codes de carte d'identité ET les QR codes de reçu de paiement.
 */
export async function verifyQrCodeAction(rawInput: string): Promise<UnifiedScanResult> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);

  if (isCardQrInput(rawInput)) {
    if (!(await checkVerificationRateLimit(user.id))) {
      return { kind: "card", valid: false, error: MESSAGES.scan.tooManyAttempts };
    }

    const res = await verifyCardQrInDb({
      rawCode: rawInput,
      requesterRole: user.role,
    });

    if (!res.valid) {
      return {
        kind: "card",
        valid: false,
        error:
          res.reason === "FORBIDDEN"
            ? MESSAGES.generic.forbidden
            : MESSAGES.scan.invalid,
      };
    }

    const code = extractCardQrCode(rawInput);
    return {
      kind: "card",
      valid: true,
      code,
      redirectUrl: `/verification/carte/${encodeURIComponent(code)}`,
    };
  }

  const receiptRes = await verifyReceiptByQrToken({
    rawToken: rawInput,
    requesterId: user.id,
    requesterRole: user.role,
  });

  return { kind: "receipt", ...receiptRes };
}
