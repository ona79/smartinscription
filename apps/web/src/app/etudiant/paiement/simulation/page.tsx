import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PAYMENT_METHOD_LABELS_FR,
  REGISTRATION_FEE_FCFA,
  ROLES,
  type PaymentMethod,
} from "@smartinscription/shared";
import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { simulateMockPaymentAction } from "@/features/paiement/actions";
import { prisma } from "@/lib/prisma";

interface SimulationPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function MockSimulationPage({ searchParams }: SimulationPageProps) {
  const user = await requireRole([ROLES.STUDENT]);
  const { ref } = await searchParams;

  if (!ref) {
    redirect("/etudiant/paiement");
  }

  const payment = await prisma.payment.findUnique({
    where: { providerRef: ref },
    include: {
      registration: {
        include: { student: true },
      },
    },
  });

  if (!payment || payment.registration.student.userId !== user.id) {
    redirect("/etudiant/paiement");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Simulateur de paiement (Mode test)"
        description="Environnement de simulation MockProvider : choisissez l'issue du paiement pour déclencher le webhook."
      />

      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Référence</span>
              <span className="font-mono font-semibold">{payment.providerRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Moyen</span>
              <span className="font-semibold">
                {PAYMENT_METHOD_LABELS_FR[payment.moyen as PaymentMethod]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-semibold">
                {REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <form action={simulateMockPaymentAction}>
              <input type="hidden" name="providerRef" value={payment.providerRef} />
              <input type="hidden" name="outcome" value="SUCCESS" />
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-brand text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Payer (Succès)
              </Button>
            </form>

            <form action={simulateMockPaymentAction}>
              <input type="hidden" name="providerRef" value={payment.providerRef} />
              <input type="hidden" name="outcome" value="FAILED" />
              <Button
                type="submit"
                variant="destructive"
                className="h-11 w-full rounded-xl text-sm font-semibold"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Simuler un échec
              </Button>
            </form>
          </div>

          <div className="text-center">
            <Link
              href="/etudiant/paiement"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Annuler et revenir
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
