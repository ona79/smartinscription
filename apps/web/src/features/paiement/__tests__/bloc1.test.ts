import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PayTechProvider } from "@/features/paiement/providers/paytech-provider";
import { checkVerificationRateLimit } from "@/features/scan/services/verification-service";

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

describe("PayTechProvider webhook verification", () => {
  const originalKey = process.env.PAYTECH_API_KEY;
  const originalSecret = process.env.PAYTECH_API_SECRET;

  beforeEach(() => {
    process.env.PAYTECH_API_KEY = "test-api-key";
    process.env.PAYTECH_API_SECRET = "test-api-secret";
  });

  afterEach(() => {
    process.env.PAYTECH_API_KEY = originalKey;
    process.env.PAYTECH_API_SECRET = originalSecret;
  });

  it("valide une notification sale_complete correctement signée", async () => {
    const provider = new PayTechProvider();
    const req = new Request("http://localhost/api/paiement/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type_event: "sale_complete",
        ref_command: "PAY-123",
        item_price: "25000",
        api_key_sha256: sha256("test-api-key"),
        api_secret_sha256: sha256("test-api-secret"),
      }),
    });

    const result = await provider.verifyWebhook(req);
    expect(result.valid).toBe(true);
    expect(result.outcome).toBe("SUCCESS");
    expect(result.providerRef).toBe("PAY-123");
  });

  it("refuse une signature invalide ou un montant altéré", async () => {
    const provider = new PayTechProvider();
    const badAmountReq = new Request("http://localhost/api/paiement/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type_event: "sale_complete",
        ref_command: "PAY-123",
        item_price: "100",
        api_key_sha256: sha256("test-api-key"),
        api_secret_sha256: sha256("test-api-secret"),
      }),
    });

    const res = await provider.verifyWebhook(badAmountReq);
    expect(res.valid).toBe(false);
  });
});

describe("Rate limiter du scan agent (repli mémoire)", () => {
  it("bloque après 30 tentatives dans la fenêtre de 60s", async () => {
    const uid = `agent-rate-${Date.now()}`;
    const now = Date.now();

    for (let i = 0; i < 30; i++) {
      expect(await checkVerificationRateLimit(uid, now)).toBe(true);
    }
    expect(await checkVerificationRateLimit(uid, now)).toBe(false);
  });
});
