"use server";

import { ROLES } from "@smartinscription/shared";
import { requireRole } from "@/features/auth/lib/session";
import {
  verifyReceiptByQrToken,
  type VerificationResult,
} from "@/features/scan/services/verification-service";

/** Server Action de vérification d'un QR code (AGENT ou ADMIN uniquement). */
export async function verifyQrCodeAction(rawToken: string): Promise<VerificationResult> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);

  return verifyReceiptByQrToken({
    rawToken,
    requesterId: user.id,
    requesterRole: user.role,
  });
}
