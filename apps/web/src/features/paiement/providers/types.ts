import type { PaymentMethod } from "@smartinscription/shared";

export interface CheckoutPaymentInput {
  paymentId: string;
  providerRef: string;
  montant: number;
  moyen: PaymentMethod;
  studentEmail: string;
  studentName: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  providerRef: string;
}

export interface VerifiedWebhookResult {
  valid: boolean;
  providerRef: string;
  outcome: "SUCCESS" | "FAILED";
  rawEvent?: string;
}

/** Interface commune à tous les fournisseurs de paiement (Mock, PayTech). */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(payment: CheckoutPaymentInput): Promise<CheckoutResult>;
  verifyWebhook(request: Request): Promise<VerifiedWebhookResult>;
}
