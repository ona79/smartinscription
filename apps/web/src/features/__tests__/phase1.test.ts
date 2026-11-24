import { describe, expect, it, vi } from "vitest";
import {
  canTransition,
  PAYMENT_STATUSES,
  REGISTRATION_STATUSES,
  ROLES,
} from "@smartinscription/shared";
import { processVerifiedWebhook } from "@/features/paiement/services/payment-service";
import {
  buildVerificationUrl,
  formatReceiptNumber,
  generateQrToken,
} from "@/features/recu/services/receipt-service";
import {
  extractQrToken,
  verifyReceiptByQrToken,
} from "@/features/scan/services/verification-service";

describe("Machine à états Registration (canTransition)", () => {
  it("autorise les transitions nominales", () => {
    expect(canTransition(REGISTRATION_STATUSES.DRAFT, REGISTRATION_STATUSES.PENDING_PAYMENT)).toBe(
      true
    );
    expect(canTransition(REGISTRATION_STATUSES.PENDING_PAYMENT, REGISTRATION_STATUSES.PAID)).toBe(
      true
    );
    expect(canTransition(REGISTRATION_STATUSES.PAID, REGISTRATION_STATUSES.DOCS_COMPLETE)).toBe(
      true
    );
    expect(canTransition(REGISTRATION_STATUSES.DOCS_COMPLETE, REGISTRATION_STATUSES.VALIDATED)).toBe(
      true
    );
  });

  it("refuse les transitions illégales", () => {
    expect(canTransition(REGISTRATION_STATUSES.DRAFT, REGISTRATION_STATUSES.PAID)).toBe(false);
    expect(canTransition(REGISTRATION_STATUSES.VALIDATED, REGISTRATION_STATUSES.DRAFT)).toBe(false);
    expect(canTransition(REGISTRATION_STATUSES.REJECTED, REGISTRATION_STATUSES.PAID)).toBe(false);
  });
});

describe("Génération du qrToken et du numéro de reçu", () => {
  it("génère un jeton base64url d'au moins 32 octets et unique", () => {
    const tokenA = generateQrToken();
    const tokenB = generateQrToken();

    expect(tokenA).not.toBe(tokenB);
    expect(Buffer.from(tokenA, "base64url").length).toBeGreaterThanOrEqual(32);
    expect(tokenA).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("encode uniquement l'URL de vérification sans donnée personnelle", () => {
    const token = generateQrToken();
    const url = buildVerificationUrl(token);
    expect(url).toContain(`/verification/${token}`);
    expect(url).not.toContain("email");
  });

  it("formate correctement le numéro de reçu séquentiel", () => {
    expect(formatReceiptNumber(123, 2026)).toBe("REC-2026-000123");
  });
});

describe("Idempotence du webhook de paiement", () => {
  it("ignore un webhook rejoué lorsque le paiement est déjà SUCCESS", async () => {
    const transactionSpy = vi.fn();
    const mockDb = {
      payment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "pay-1",
          registrationId: "reg-1",
          providerRef: "PAY-REF-1",
          statut: PAYMENT_STATUSES.SUCCESS,
          receiptNumber: "REC-2026-000001",
          qrToken: "existing-token-xyz",
          registration: { id: "reg-1", statut: REGISTRATION_STATUSES.PAID },
        }),
      },
      $transaction: transactionSpy,
    };

    const result = await processVerifiedWebhook(
      { valid: true, providerRef: "PAY-REF-1", outcome: "SUCCESS" },
      { db: mockDb as never, skipPdfUpload: true }
    );

    expect(result.alreadyProcessed).toBe(true);
    expect(result.receiptNumber).toBe("REC-2026-000001");
    expect(result.qrToken).toBe("existing-token-xyz");
    expect(transactionSpy).not.toHaveBeenCalled();
  });
});

describe("Contrôle d'accès du scan QR", () => {
  it("refuse le scan à un utilisateur ayant le rôle STUDENT", async () => {
    const findUniqueSpy = vi.fn();
    const result = await verifyReceiptByQrToken(
      {
        rawToken: "a".repeat(43),
        requesterId: "user-student-1",
        requesterRole: ROLES.STUDENT,
      },
      { db: { payment: { findUnique: findUniqueSpy } } as never, skipRateLimit: true }
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Accès refusé");
    }
    expect(findUniqueSpy).not.toHaveBeenCalled();
  });

  it("extrait le jeton depuis une URL complète ou brute", () => {
    expect(extractQrToken("https://app.sn/verification/abc123token")).toBe("abc123token");
    expect(extractQrToken("abc123token")).toBe("abc123token");
  });
});
