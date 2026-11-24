import crypto from "node:crypto";
import type {
  CheckoutPaymentInput,
  CheckoutResult,
  PaymentProvider,
  VerifiedWebhookResult,
} from "./types";

function getMockSecret(): string {
  return process.env.MOCK_WEBHOOK_SECRET || "smartinscription-dev-mock-secret";
}

/** Calcule la signature HMAC-SHA256 pour sécuriser le webhook de simulation. */
export function signMockWebhookPayload(
  providerRef: string,
  outcome: "SUCCESS" | "FAILED"
): string {
  return crypto
    .createHmac("sha256", getMockSecret())
    .update(`${providerRef}:${outcome}`)
    .digest("hex");
}

/** Fournisseur de simulation local pour tester le parcours sans compte PayTech. */
export class MockProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckout(payment: CheckoutPaymentInput): Promise<CheckoutResult> {
    const checkoutUrl = `/etudiant/paiement/simulation?ref=${encodeURIComponent(payment.providerRef)}`;
    return {
      checkoutUrl,
      providerRef: payment.providerRef,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifiedWebhookResult> {
    const signature = request.headers.get("x-mock-signature") ?? "";
    const body = (await request.json().catch(() => null)) as {
      providerRef?: string;
      outcome?: string;
    } | null;

    if (!body?.providerRef || (body.outcome !== "SUCCESS" && body.outcome !== "FAILED")) {
      return { valid: false, providerRef: "", outcome: "FAILED" };
    }

    const expected = signMockWebhookPayload(body.providerRef, body.outcome);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, providerRef: body.providerRef, outcome: "FAILED" };
    }

    return {
      valid: true,
      providerRef: body.providerRef,
      outcome: body.outcome,
      rawEvent: `mock.${body.outcome.toLowerCase()}`,
    };
  }
}
