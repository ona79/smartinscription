import Link from "next/link";
import {
  APPOINTMENT_STATUSES,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
} from "@smartinscription/shared";
import { Calendar, Check, FileCheck2, QrCode, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { updateAppointmentStatusAction } from "@/features/rendez-vous/actions";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function AgentHomePage() {
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
      include: {
        student: {
          include: { user: true, ufr: true, filiere: true },
        },
        _count: { select: { documents: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
    prisma.appointment.findMany({
      where: { statut: APPOINTMENT_STATUSES.SCHEDULED },
      include: {
        student: {
          include: { user: true },
        },
      },
      orderBy: { debut: "asc" },
      take: 15,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Accueil agent de scolarité"
        description="Vérification des pièces justificatives, gestion des rendez-vous et scan QR."
        actions={
          <Link
            href="/agent/scan"
            className={cn(
              buttonVariants({ size: "default" }),
              "h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            )}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scanner un QR code
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Dossiers à vérifier"
          value={dossiers.length}
          description="Inscriptions payées en cours de contrôle"
          icon={FileCheck2}
        />
        <StatCard
          title="Rendez-vous planifiés"
          value={appointments.length}
          description="Passages étudiants à venir"
          icon={Calendar}
        />
      </div>

      {/* Dossiers à vérifier */}
      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Dossiers en attente de vérification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dossiers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun dossier en attente de contrôle pour le moment.
            </p>
          ) : (
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
                    <TableCell className="text-xs text-muted-foreground">
                      {reg.student.filiere.nom} ({reg.student.niveau})
                    </TableCell>
                    <TableCell>{reg._count.documents} / 4</TableCell>
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
                          "rounded-xl text-xs"
                        )}
                      >
                        Vérifier
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rendez-vous planifiés */}
      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Rendez-vous planifiés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous planifié pour le moment.
            </p>
          ) : (
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
                    <TableCell className="text-xs">
                      {appt.debut.toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1.5">
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="appointmentId" value={appt.id} />
                          <input type="hidden" name="status" value="COMPLETED" />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-8 rounded-lg bg-brand px-2.5 text-xs text-brand-foreground hover:bg-brand-dark"
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Effectué
                          </Button>
                        </form>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="appointmentId" value={appt.id} />
                          <input type="hidden" name="status" value="NO_SHOW" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg px-2.5 text-xs"
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Absent
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
