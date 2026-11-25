import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_FEE_FCFA,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
} from "@smartinscription/shared";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/features/auth/lib/session";
import { RegistrationStepper } from "@/features/dossier/components/registration-stepper";
import { getStudentDashboardData } from "@/features/dossier/queries";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { getUserNotifications } from "@/features/notifications/services/notification-service";
import { measurePerf } from "@/lib/perf";
import { cn } from "@/lib/utils";

async function NotificationsSection({ userId }: { userId: string }) {
  const notifications = await getUserNotifications(userId, 6);
  return <NotificationList notifications={notifications} />;
}

function NotificationsSkeleton() {
  return (
    <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default async function StudentDashboardPage() {
  return measurePerf("page", "/etudiant", async () => {
    const user = await requireRole([ROLES.STUDENT]);
    const { student, registration } = await getStudentDashboardData(user.id);

    if (!student || !registration) {
      redirect("/etudiant/dossier");
    }

    const status = registration.statut;
    const isPaid =
      status === REGISTRATION_STATUSES.PAID ||
      status === REGISTRATION_STATUSES.DOCS_INCOMPLETE ||
      status === REGISTRATION_STATUSES.DOCS_COMPLETE ||
      status === REGISTRATION_STATUSES.VALIDATED;
    const docsMissing =
      registration._count.documents < 4 ||
      status === REGISTRATION_STATUSES.DOCS_INCOMPLETE;

    const primaryAction = !isPaid
      ? {
          href: "/etudiant/paiement",
          label: "Payer mes frais",
          icon: CreditCard,
        }
      : docsMissing
        ? {
            href: "/etudiant/documents",
            label: "Déposer mes pièces",
            icon: FileText,
          }
        : {
            href: "/etudiant/paiement",
            label: "Voir mon reçu et QR code",
            icon: CheckCircle2,
          };

    const ActionIcon = primaryAction.icon;

    return (
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title={`Bonjour, ${user.prenom}`}
          description={`${student.ufr.nom} · ${student.filiere.nom} · ${student.niveau}`}
          badge={
            <Badge
              variant="secondary"
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {REGISTRATION_STATUS_LABELS_FR[status]}
            </Badge>
          }
          actions={
            <Link
              href={primaryAction.href}
              className={cn(
                buttonVariants({ size: "default" }),
                "w-full rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto"
              )}
            >
              <ActionIcon className="mr-2 h-4 w-4" />
              {primaryAction.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          }
        />

        <RegistrationStepper hasProfile={Boolean(student)} status={status} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            title="Statut du dossier"
            value={REGISTRATION_STATUS_LABELS_FR[status]}
            description={`N° ${student.numeroEtudiant}`}
            icon={GraduationCap}
          />
          <StatCard
            title="Frais d'inscription"
            value={`${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA`}
            description={isPaid ? "Paiement confirmé" : "En attente"}
            icon={CreditCard}
          />
          <StatCard
            title="Année académique"
            value={CURRENT_ACADEMIC_YEAR}
            description={`${registration._count.documents}/4 document(s) déposé(s)`}
            icon={Calendar}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">
              {isPaid
                ? "Votre inscription est réglée"
                : "Prochaine étape : régler les frais d'inscription"}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {isPaid
                ? "Téléchargez votre reçu numérique et présentez le QR code à un agent lors de votre passage."
                : "Effectuez le paiement de 25 000 FCFA par Mobile Money ou carte bancaire pour obtenir votre reçu."}
            </p>
          </CardContent>
        </Card>

        <section id="notifications">
          <Suspense fallback={<NotificationsSkeleton />}>
            <NotificationsSection userId={user.id} />
          </Suspense>
        </section>
      </div>
    );
  });
}
