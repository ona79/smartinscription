import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_FEE_FCFA,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
} from "@smartinscription/shared";
import { ArrowRight, Calendar, CheckCircle2, CreditCard, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { RegistrationStepper } from "@/features/dossier/components/registration-stepper";
import { getStudentDashboardData } from "@/features/dossier/queries";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { getUserNotifications } from "@/features/notifications/services/notification-service";
import { cn } from "@/lib/utils";

export default async function StudentDashboardPage() {
  const user = await requireRole([ROLES.STUDENT]);
  const [{ student, registration }, notifications] = await Promise.all([
    getStudentDashboardData(user.id),
    getUserNotifications(user.id, 6),
  ]);

  // Redirige vers la complétion du profil si l'étudiant n'en a pas encore
  if (!student || !registration) {
    redirect("/etudiant/dossier");
  }

  const status = registration.statut;
  const isPaid =
    status === REGISTRATION_STATUSES.PAID ||
    status === REGISTRATION_STATUSES.DOCS_INCOMPLETE ||
    status === REGISTRATION_STATUSES.DOCS_COMPLETE ||
    status === REGISTRATION_STATUSES.VALIDATED;

  const primaryAction = !isPaid
    ? {
        href: "/etudiant/paiement",
        label: "Payer mes frais (25 000 FCFA)",
        icon: CreditCard,
      }
    : {
        href: "/etudiant/paiement",
        label: "Voir mon reçu et QR code",
        icon: CheckCircle2,
      };

  const ActionIcon = primaryAction.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={`Bonjour, ${user.prenom}`}
        description={`${student.ufr.nom} · ${student.filiere.nom} · ${student.niveau}`}
        badge={
          <Badge
            variant="secondary"
            className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
          >
            {REGISTRATION_STATUS_LABELS_FR[status]}
          </Badge>
        }
        actions={
          <Link
            href={primaryAction.href}
            className={cn(
              buttonVariants({ size: "default" }),
              "h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            )}
          >
            <ActionIcon className="mr-2 h-4 w-4" />
            {primaryAction.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        }
      />

      <RegistrationStepper hasProfile={Boolean(student)} status={status} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Statut du dossier"
          value={REGISTRATION_STATUS_LABELS_FR[status]}
          description={`N° ${student.numeroEtudiant}`}
          icon={GraduationCap}
        />
        <StatCard
          title="Frais d'inscription"
          value={`${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA`}
          description={isPaid ? "Paiement confirmé" : "En attente de règlement"}
          icon={CreditCard}
        />
        <StatCard
          title="Année académique"
          value={CURRENT_ACADEMIC_YEAR}
          description={`${registration._count.documents} document(s) déposé(s)`}
          icon={Calendar}
        />
      </div>

      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {isPaid
                ? "Votre inscription est réglée"
                : "Prochaine étape : régler les frais d'inscription"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isPaid
                ? "Téléchargez votre reçu numérique et présentez le QR code à un agent lors de votre passage."
                : "Effectuez le paiement de 25 000 FCFA par Mobile Money ou carte bancaire pour obtenir votre reçu."}
            </p>
          </div>
          <Link
            href={primaryAction.href}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 shrink-0 rounded-xl px-4 text-sm font-medium"
            )}
          >
            {primaryAction.label}
          </Link>
        </CardContent>
      </Card>

      <NotificationList notifications={notifications} />
    </div>
  );
}
