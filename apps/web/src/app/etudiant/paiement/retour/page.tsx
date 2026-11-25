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
import { PaymentReturnToast } from "@/features/paiement/components/payment-return-toast";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface ReturnPageProps {
  searchParams: Promise<{ ref?: string; status?: string }>;
}

export default async function PaymentReturnPage({ searchParams }: ReturnPageProps) {
  const user = await requireRole([ROLES.STUDENT]);
  const { ref, status } = await searchParams;

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
  const isCancelled = !isSuccess && status === "cancelled";
  const isFailed = !isCancelled && payment.statut === PAYMENT_STATUSES.FAILED;
  const outcome: "success" | "failed" | "cancelled" | "pending" = isSuccess
    ? "success"
    : isCancelled
      ? "cancelled"
      : isFailed
        ? "failed"
        : "pending";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PaymentReturnToast status={outcome} />

      <PageHeader
        title="Résultat du paiement"
        description={`Référence de transaction : ${payment.providerRef}`}
      />

      <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
        <CardContent className="flex flex-col items-center space-y-4 p-5 text-center sm:p-8">
          {isSuccess ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          ) : isFailed || isCancelled ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Clock className="h-7 w-7" />
            </div>
          )}

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">
              {isSuccess
                ? "Paiement réussi"
                : isCancelled
                  ? "Paiement annulé"
                  : isFailed
                    ? "Paiement échoué"
                    : "Paiement en attente de confirmation"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSuccess
                ? `Vos frais d'inscription de ${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA ont bien été validés.`
                : isCancelled
                  ? MESSAGES.payment.cancelled
                  : isFailed
                    ? MESSAGES.payment.failed
                    : MESSAGES.payment.pending}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2.5 pt-2 sm:w-auto sm:flex-row sm:justify-center">
            {(isFailed || isCancelled) && (
              <Link
                href="/etudiant/paiement"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "w-full rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark sm:w-auto"
                )}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Réessayer
              </Link>
            )}
            <Link
              href={isSuccess ? "/etudiant/paiement" : "/etudiant"}
              className={cn(
                buttonVariants({
                  variant: isFailed || isCancelled ? "outline" : "default",
                }),
                "w-full rounded-lg px-5 text-sm font-semibold sm:w-auto",
                !isFailed && !isCancelled && "bg-brand text-brand-foreground hover:bg-brand-dark"
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
