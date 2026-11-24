import crypto from "node:crypto";
import { REGISTRATION_FEE_FCFA } from "@smartinscription/shared";
import type {
  CheckoutPaymentInput,
  CheckoutResult,
  PaymentProvider,
  VerifiedWebhookResult,
} from "./types";

const PAYTECH_API_URL = "https://paytech.sn/api/payment/request-payment";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a.toLowerCase());
  const bufB = Buffer.from(b.toLowerCase());
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Intégration réelle de l'agrégateur sénégalais PayTech (mode test/sandbox ou prod). */
export class PayTechProvider implements PaymentProvider {
  readonly name = "paytech";

  private getCredentials() {
    const apiKey = process.env.PAYTECH_API_KEY;
    const apiSecret = process.env.PAYTECH_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error(
        "PAYTECH_API_KEY et PAYTECH_API_SECRET doivent être configurés pour utiliser PayTech."
      );
    }
    return { apiKey, apiSecret };
  }

  async createCheckout(payment: CheckoutPaymentInput): Promise<CheckoutResult> {
    const { apiKey, apiSecret } = this.getCredentials();
    const appUrl =
      process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(PAYTECH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        API_KEY: apiKey,
        API_SECRET: apiSecret,
      },
      body: JSON.stringify({
        item_name: "Frais d'inscription universitaire",
        item_price: REGISTRATION_FEE_FCFA,
        currency: "XOF",
        ref_command: payment.providerRef,
        command_name: `Inscription SmartInscription - ${payment.providerRef}`,
        env: process.env.PAYTECH_ENV === "prod" ? "prod" : "test",
        ipn_url: `${appUrl}/api/paiement/webhook`,
        success_url: `${appUrl}/etudiant/paiement/retour?ref=${encodeURIComponent(payment.providerRef)}`,
        cancel_url: `${appUrl}/etudiant/paiement/retour?ref=${encodeURIComponent(payment.providerRef)}`,
      }),
    });

    const data = (await response.json()) as {
      success?: number;
      redirect_url?: string;
      message?: string;
    };

    if (!response.ok || data.success !== 1 || !data.redirect_url) {
      throw new Error(data.message || "Erreur lors de l'initialisation du paiement PayTech.");
    }

    return {
      checkoutUrl: data.redirect_url,
      providerRef: payment.providerRef,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifiedWebhookResult> {
    const { apiKey, apiSecret } = this.getCredentials();
    const contentType = request.headers.get("content-type") ?? "";

    let payload: Record<string, string> = {};
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (typeof value === "string") payload[key] = value;
      });
    } else {
      payload = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, string>;
    }

    const refCommand = payload.ref_command ?? "";
    const typeEvent = payload.type_event ?? "";
    const keyHash = payload.api_key_sha256 ?? "";
    const secretHash = payload.api_secret_sha256 ?? "";

    const validKey = safeEqualHex(keyHash, sha256Hex(apiKey));
    const validSecret = safeEqualHex(secretHash, sha256Hex(apiSecret));

    if (!validKey || !validSecret || !refCommand) {
      return { valid: false, providerRef: refCommand, outcome: "FAILED" };
    }

    return {
      valid: true,
      providerRef: refCommand,
      outcome: typeEvent === "sale_complete" ? "SUCCESS" : "FAILED",
      rawEvent: typeEvent,
    };
  }
}
