import Link from "next/link";
import {
  APPOINTMENT_STATUSES,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
} from "@smartinscription/shared";
import { Calendar, ChevronRight, FileCheck2, QrCode } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/features/auth/lib/session";
import { AppointmentStatusButtons } from "@/features/rendez-vous/components/appointment-status-buttons";
import { measurePerf } from "@/lib/perf";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function AgentHomePage() {
  return measurePerf("page", "/agent", async () => {
    await requireRole([ROLES.AGENT, ROLES.ADMIN]);

    const [dossiers, appointments] = await Promise.all([
      prisma.registration.findMany({
        where: {
          statut: {
            in: [
              REGISTRATION_STATUSES.PAID,
              REGISTRATION_STATUSES.DOCS_INCOMPLETE,
              REGISTRATION_STATUSES.DOCS_COMPLETE,
            ],
          },
        },
        select: {
          id: true,
          statut: true,
          student: {
            select: {
              numeroEtudiant: true,
              niveau: true,
              user: { select: { prenom: true, nom: true } },
              filiere: { select: { nom: true } },
            },
          },
          _count: { select: { documents: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
      }),
      prisma.appointment.findMany({
        where: { statut: APPOINTMENT_STATUSES.SCHEDULED },
        select: {
          id: true,
          debut: true,
          student: {
            select: {
              numeroEtudiant: true,
              user: { select: { prenom: true, nom: true } },
            },
          },
        },
        orderBy: { debut: "asc" },
        take: 15,
      }),
    ]);

    return (
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title="Accueil agent de scolarité"
          description="Vérification des pièces justificatives, gestion des rendez-vous et scan QR."
          actions={
            <Link
              href="/agent/scan"
              className={cn(
                buttonVariants({ size: "default" }),
                "w-full rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto"
              )}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner un QR code
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard
            title="Dossiers à vérifier"
            value={dossiers.length}
            description="Inscriptions payées"
            icon={FileCheck2}
          />
          <StatCard
            title="Rendez-vous planifiés"
            value={appointments.length}
            description="Passages à venir"
            icon={Calendar}
          />
        </div>

        {/* Dossiers à vérifier */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle className="text-base font-semibold">
              Dossiers en attente de vérification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            {dossiers.length === 0 ? (
              <EmptyState
                icon={FileCheck2}
                title="Aucun dossier en attente"
                description="Tous les dossiers payés ont été traités."
              />
            ) : (
              <>
                {/* Mobile : liste de cartes cliquables */}
                <div className="space-y-2.5 md:hidden">
                  {dossiers.map((reg) => (
                    <Link
                      key={reg.id}
                      href={`/agent/dossiers/${reg.id}`}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3.5 transition-colors hover:border-brand/50"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {reg.student.user.prenom} {reg.student.user.nom}
                          </p>
                          <Badge variant="secondary" className="rounded-full text-[11px]">
                            {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                          </Badge>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {reg.student.numeroEtudiant} · {reg._count.documents}/4 pièces
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reg.student.filiere.nom} ({reg.student.niveau})
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>

                {/* Desktop : tableau */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Étudiant</TableHead>
                        <TableHead>N° étudiant</TableHead>
                        <TableHead>Filière</TableHead>
                        <TableHead>Pièces</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dossiers.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            {reg.student.user.prenom} {reg.student.user.nom}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {reg.student.numeroEtudiant}
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {reg.student.filiere.nom} ({reg.student.niveau})
                          </TableCell>
                          <TableCell>{reg._count.documents}/4</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="rounded-full text-xs">
                              {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/agent/dossiers/${reg.id}`}
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "h-9 rounded-lg text-[13px]"
                              )}
                            >
                              Vérifier
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rendez-vous planifiés */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle className="text-base font-semibold">Rendez-vous planifiés</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            {appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Aucun rendez-vous planifié"
                description="Les prochains créneaux réservés apparaîtront ici."
              />
            ) : (
              <>
                <div className="space-y-2.5 md:hidden">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="space-y-2.5 rounded-xl border border-border bg-background/50 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {appt.student.user.prenom} {appt.student.user.nom}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {appt.student.numeroEtudiant}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {appt.debut.toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <AppointmentStatusButtons appointmentId={appt.id} />
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Étudiant</TableHead>
                        <TableHead>N° étudiant</TableHead>
                        <TableHead>Créneau</TableHead>
                        <TableHead className="text-right">Présence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appt) => (
                        <TableRow key={appt.id}>
                          <TableCell className="font-medium">
                            {appt.student.user.prenom} {appt.student.user.nom}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {appt.student.numeroEtudiant}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {appt.debut.toLocaleString("fr-FR", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <AppointmentStatusButtons appointmentId={appt.id} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  });
}
