import { MockProvider } from "./mock-provider";
import { PayTechProvider } from "./paytech-provider";
import type { PaymentProvider } from "./types";

/** Retourne le fournisseur de paiement actif selon PAYMENT_PROVIDER (mock par défaut). */
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER?.toLowerCase();
  if (provider === "paytech") {
    return new PayTechProvider();
  }
  return new MockProvider();
}
