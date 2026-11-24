import { redirect } from "next/navigation";
import {
  CURRENT_ACADEMIC_YEAR,
  PAYMENT_STATUSES,
  REGISTRATION_FEE_FCFA,
  ROLES,
} from "@smartinscription/shared";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { getStudentDashboardData } from "@/features/dossier/queries";
import { PaymentMethodForm } from "@/features/paiement/components/payment-method-form";

export default async function StudentPaiementPage() {
  const user = await requireRole([ROLES.STUDENT]);
  const { student, registration } = await getStudentDashboardData(user.id);

  if (!student || !registration) {
    redirect("/etudiant/dossier");
  }

  const successPayment = registration.payments.find(
    (p) => p.statut === PAYMENT_STATUSES.SUCCESS
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Paiement des frais d'inscription"
        description={`Année académique ${CURRENT_ACADEMIC_YEAR} — Montant fixe : ${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA`}
        badge={
          successPayment ? (
            <Badge className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white">
              Payé
            </Badge>
          ) : null
        }
      />

      {successPayment ? (
        <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Paiement confirmé
              </h2>
              <p className="text-sm text-muted-foreground">
                Référence : <span className="font-mono">{successPayment.providerRef}</span>
              </p>
            </div>
          </CardContent>
        </Card>
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
}
