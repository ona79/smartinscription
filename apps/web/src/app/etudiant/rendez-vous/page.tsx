import Link from "next/link";
import { redirect } from "next/navigation";
import {
  APPOINTMENT_STATUSES,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
} from "@smartinscription/shared";
import { Calendar, CheckCircle2, CreditCard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { getStudentDashboardData } from "@/features/dossier/queries";
import { CancelAppointmentButton } from "@/features/rendez-vous/components/cancel-appointment-button";
import { SlotPicker } from "@/features/rendez-vous/components/slot-picker";
import { generateAvailableSlots } from "@/features/rendez-vous/services/appointment-service";
import { measurePerf } from "@/lib/perf";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function StudentRendezVousPage() {
  return measurePerf("page", "/etudiant/rendez-vous", async () => {
    const user = await requireRole([ROLES.STUDENT]);
    const [{ student, registration }, activeAppointment, booked] = await Promise.all([
      getStudentDashboardData(user.id),
      prisma.appointment.findFirst({
        where: {
          student: { userId: user.id },
          statut: APPOINTMENT_STATUSES.SCHEDULED,
        },
        orderBy: { debut: "asc" },
        select: { id: true, debut: true },
      }),
      prisma.appointment.findMany({
        where: {
          statut: APPOINTMENT_STATUSES.SCHEDULED,
          debut: { gte: new Date() },
        },
        select: { debut: true },
      }),
    ]);

  if (!student || !registration) {
    redirect("/etudiant/dossier");
  }

  const paidStatuses: RegistrationStatus[] = [
    REGISTRATION_STATUSES.PAID,
    REGISTRATION_STATUSES.DOCS_INCOMPLETE,
    REGISTRATION_STATUSES.DOCS_COMPLETE,
    REGISTRATION_STATUSES.VALIDATED,
  ];
  const isPaid = paidStatuses.includes(registration.statut as RegistrationStatus);

  const availableSlots = generateAvailableSlots(booked.map((b) => b.debut));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Mes rendez-vous"
        description="Réservez un créneau de 30 minutes pour la validation physique de votre dossier."
      />

      {!isPaid ? (
        <EmptyState
          icon={CreditCard}
          title="Paiement requis avant la prise de rendez-vous"
          description="Réglez d'abord les frais d'inscription de 25 000 FCFA pour choisir votre créneau de passage."
          action={
            <Link
              href="/etudiant/paiement"
              className={cn(
                buttonVariants({ size: "default" }),
                "h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              )}
            >
              Payer mes frais
            </Link>
          }
        />
      ) : activeAppointment ? (
        <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    Rendez-vous confirmé
                  </h2>
                  <Badge className="rounded-full bg-success px-2.5 py-0.5 text-xs text-white">
                    Planifié
                  </Badge>
                </div>
                <p className="text-sm font-medium capitalize text-foreground">
                  {activeAppointment.debut.toLocaleString("fr-FR", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Présentez-vous avec votre reçu QR code et vos pièces originales.
                </p>
              </div>
            </div>

            <CancelAppointmentButton appointmentId={activeAppointment.id} />
          </CardContent>
        </Card>
      ) : availableSlots.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucun créneau disponible"
          description="Tous les créneaux des prochains jours ouvrés sont complets. Réessayez plus tard."
        />
      ) : (
        <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <SlotPicker slots={availableSlots} />
          </CardContent>
        </Card>
      )}
    </div>
  );
  });
}
