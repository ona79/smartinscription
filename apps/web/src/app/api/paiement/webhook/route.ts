import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/features/paiement/providers";
import { processVerifiedWebhook } from "@/features/paiement/services/payment-service";

/** Point d'entrée webhook unique (MockProvider et PayTech IPN). */
export async function POST(request: Request) {
  try {
    const provider = getPaymentProvider();
    const verified = await provider.verifyWebhook(request);

    if (!verified.valid || !verified.providerRef) {
      return NextResponse.json(
        { error: "Signature webhook invalide." },
        { status: 401 }
      );
    }

    const result = await processVerifiedWebhook(verified);

    return NextResponse.json({
      ok: true,
      alreadyProcessed: result.alreadyProcessed,
      statut: result.statut,
    });
  } catch (error) {
    console.error("[webhook] Erreur de traitement:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook." },
      { status: 500 }
    );
  }
}
