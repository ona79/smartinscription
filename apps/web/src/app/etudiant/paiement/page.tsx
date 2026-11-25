import { redirect } from "next/navigation";
import {
  CURRENT_ACADEMIC_YEAR,
  PAYMENT_STATUSES,
  REGISTRATION_FEE_FCFA,
  ROLES,
  type PaymentMethod,
} from "@smartinscription/shared";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { getStudentPaiementData } from "@/features/dossier/queries";
import { PaymentMethodForm } from "@/features/paiement/components/payment-method-form";
import { ReceiptCard } from "@/features/recu/components/receipt-card";
import { generateQrDataUrl } from "@/features/recu/services/receipt-service";
import { measurePerf } from "@/lib/perf";

export default async function StudentPaiementPage() {
  return measurePerf("page", "/etudiant/paiement", async () => {
    const user = await requireRole([ROLES.STUDENT]);
    const { student, registration } = await getStudentPaiementData(user.id);

    if (!student || !registration) {
      redirect("/etudiant/dossier");
    }

    const successPayment = registration.payments.find(
      (p) => p.statut === PAYMENT_STATUSES.SUCCESS
    );

    const qrDataUrl =
      successPayment?.qrToken ? await generateQrDataUrl(successPayment.qrToken) : null;

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Paiement & Reçu numérique"
          description={`Année académique ${CURRENT_ACADEMIC_YEAR} — Frais d'inscription : ${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA`}
          badge={
            successPayment ? (
              <Badge className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white">
                Payé
              </Badge>
            ) : null
          }
        />

        {successPayment && qrDataUrl && successPayment.receiptNumber ? (
          <ReceiptCard
            paymentId={successPayment.id}
            receiptNumber={successPayment.receiptNumber}
            providerRef={successPayment.providerRef}
            montant={successPayment.montant}
            moyen={successPayment.moyen as PaymentMethod}
            paidAt={successPayment.paidAt ?? successPayment.createdAt}
            qrDataUrl={qrDataUrl}
            studentName={`${user.prenom} ${user.nom}`}
            numeroEtudiant={student.numeroEtudiant}
          />
        ) : (
          <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Choisissez votre moyen de paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <PaymentMethodForm />
            </CardContent>
          </Card>
        )}
      </div>
    );
  });
}
