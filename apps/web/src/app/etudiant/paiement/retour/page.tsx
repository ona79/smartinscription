import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PAYMENT_STATUSES,
  REGISTRATION_FEE_FCFA,
  ROLES,
} from "@smartinscription/shared";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface ReturnPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function PaymentReturnPage({ searchParams }: ReturnPageProps) {
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

  const isSuccess = payment.statut === PAYMENT_STATUSES.SUCCESS;
  const isFailed = payment.statut === PAYMENT_STATUSES.FAILED;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Résultat du paiement"
        description={`Référence de transaction : ${payment.providerRef}`}
      />

      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardContent className="flex flex-col items-center space-y-4 p-8 text-center">
          {isSuccess ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          ) : isFailed ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <XCircle className="h-8 w-8" />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Clock className="h-8 w-8" />
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              {isSuccess
                ? "Paiement réussi"
                : isFailed
                  ? "Paiement échoué"
                  : "Paiement en attente de confirmation"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSuccess
                ? `Vos frais d'inscription de ${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA ont bien été validés.`
                : isFailed
                  ? "La transaction n'a pas abouti. Vous pouvez réessayer avec le même ou un autre moyen de paiement."
                  : "Nous attendons la confirmation du fournisseur de paiement. Actualisez dans quelques instants."}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {isFailed && (
              <Link
                href="/etudiant/paiement"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
                )}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Réessayer
              </Link>
            )}
            <Link
              href={isSuccess ? "/etudiant/paiement" : "/etudiant"}
              className={cn(
                buttonVariants({ variant: isFailed ? "outline" : "default" }),
                "h-10 rounded-xl px-5 text-sm font-semibold",
                !isFailed && "bg-brand text-brand-foreground hover:bg-brand-dark"
              )}
            >
              {isSuccess ? "Voir mon reçu" : "Retour au tableau de bord"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
