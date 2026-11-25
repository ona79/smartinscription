"use server";

import { PAYMENT_METHODS, ROLES, type PaymentMethod } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { POST as webhookPostHandler } from "@/app/api/paiement/webhook/route";
import { requireRole } from "@/features/auth/lib/session";
import { signMockWebhookPayload } from "@/features/paiement/providers/mock-provider";
import { initiateStudentPayment } from "@/features/paiement/services/payment-service";
import { actionValidationError, type ActionResult } from "@/lib/action-result";
import { toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";

export type PaymentActionState = ActionResult;

const paymentMethodValues = Object.values(PAYMENT_METHODS) as [
  PaymentMethod,
  ...PaymentMethod[],
];

const startPaymentSchema = z.object({
  moyen: z.enum(paymentMethodValues, {
    message: MESSAGES.generic.formInvalid,
  }),
});

/** Lance le paiement des 25 000 FCFA et redirige vers l'écran du fournisseur. */
export async function startPaymentAction(
  _prevState: PaymentActionState | null,
  formData: FormData
): Promise<PaymentActionState> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = startPaymentSchema.safeParse({
    moyen: formData.get("moyen"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  let checkoutUrl = "";
  try {
    const checkout = await initiateStudentPayment({
      userId: user.id,
      moyen: parsed.data.moyen,
    });
    checkoutUrl = checkout.checkoutUrl;
  } catch (error) {
    return toActionError(error, "payment.start");
  }

  revalidatePath("/etudiant");
  revalidatePath("/etudiant/paiement");
  redirect(checkoutUrl);
}

/**
 * Simule la notification webhook du MockProvider en appelant exactement
 * le même point d'entrée /api/paiement/webhook signé par HMAC.
 */
export async function simulateMockPaymentAction(formData: FormData): Promise<void> {
  await requireRole([ROLES.STUDENT]);

  const providerRef = String(formData.get("providerRef") ?? "");
  const outcome = formData.get("outcome") === "SUCCESS" ? "SUCCESS" : "FAILED";

  if (!providerRef) {
    redirect("/etudiant/paiement");
  }

  const signature = signMockWebhookPayload(providerRef, outcome);
  const webhookRequest = new Request("http://localhost/api/paiement/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mock-signature": signature,
    },
    body: JSON.stringify({ providerRef, outcome }),
  });

  await webhookPostHandler(webhookRequest);

  revalidatePath("/etudiant");
  revalidatePath("/etudiant/paiement");
  redirect(`/etudiant/paiement/retour?ref=${encodeURIComponent(providerRef)}`);
}
