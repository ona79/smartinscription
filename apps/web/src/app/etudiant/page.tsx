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
  CheckCircle2,
  CreditCard,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
      <CardContent className="space-y-2 p-3.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
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
            label: "Voir mon reçu",
            icon: CheckCircle2,
          };

    const ActionIcon = primaryAction.icon;

    return (
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          title={`Bonjour, ${user.prenom}`}
          description={`${student.ufr.code} · ${student.filiere.nom} · ${student.niveau} · ${CURRENT_ACADEMIC_YEAR}`}
          badge={
            <Badge
              variant="secondary"
              className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
            >
              {REGISTRATION_STATUS_LABELS_FR[status]}
            </Badge>
          }
          actions={
            <Link
              href={primaryAction.href}
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-9 w-full rounded-lg bg-brand px-3.5 text-xs font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto sm:text-[13px]"
              )}
            >
              <ActionIcon className="mr-1.5 h-3.5 w-3.5" />
              {primaryAction.label}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          }
        />

        <RegistrationStepper hasProfile={Boolean(student)} status={status} />

        {/* Synthèse compacte en 1 seul bloc */}
        <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardContent className="grid grid-cols-3 divide-x divide-border p-0">
            <div className="min-w-0 px-3 py-2.5 sm:px-4">
              <p className="truncate text-[11px] text-muted-foreground">Dossier</p>
              <p className="truncate font-mono text-xs font-semibold text-foreground sm:text-sm">
                {student.numeroEtudiant}
              </p>
            </div>
            <div className="min-w-0 px-3 py-2.5 sm:px-4">
              <p className="truncate text-[11px] text-muted-foreground">Frais</p>
              <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                {REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} F ·{" "}
                <span className={isPaid ? "text-success" : "text-amber-700"}>
                  {isPaid ? "Payé" : "Dû"}
                </span>
              </p>
            </div>
            <div className="min-w-0 px-3 py-2.5 sm:px-4">
              <p className="truncate text-[11px] text-muted-foreground">Pièces</p>
              <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                {registration._count.documents}/4 déposée(s)
              </p>
            </div>
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
