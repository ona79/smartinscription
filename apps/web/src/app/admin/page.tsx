import Link from "next/link";
import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUS_LABELS_FR,
  ROLE_LABELS_FR,
  ROLES,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import {
  ArrowRight,
  Banknote,
  Clock,
  CreditCard,
  GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UpdateUserRoleForm } from "@/features/admin/components/admin-row-actions";
import { AutoRefresh } from "@/features/admin/components/auto-refresh";
import { getAdminDashboardMetrics } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";
import { measurePerf } from "@/lib/perf";

export default async function AdminDashboardPage() {
  return measurePerf("page", "/admin", async () => {
    const adminUser = await requireRole([ROLES.ADMIN]);
    const metrics = await getAdminDashboardMetrics();

    return (
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          title="Tableau de bord administrateur"
          description={`Suivi des inscriptions et encaissements (${CURRENT_ACADEMIC_YEAR}).`}
          actions={<AutoRefresh intervalMs={30_000} />}
        />

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <StatCard
            title="Étudiants inscrits"
            value={metrics.totalStudents}
            description="Profils créés"
            icon={GraduationCap}
          />
          <StatCard
            title="Transactions"
            value={metrics.paidCount}
            description={`${metrics.unresolvedFraudCount} alerte(s)`}
            icon={CreditCard}
          />
          <StatCard
            title="Recettes"
            value={`${metrics.totalRevenueFcfa.toLocaleString("fr-FR")} F`}
            description={`Année ${CURRENT_ACADEMIC_YEAR}`}
            icon={Banknote}
          />
          <StatCard
            title="File du jour"
            value={metrics.activeQueueCount}
            description={`${metrics.paidNotValidatedCount} à valider · ${metrics.todayAppointmentsCount} RDV`}
            icon={Clock}
          />
        </div>

        {/* Dernières inscriptions */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4">
            <CardTitle className="text-sm font-semibold sm:text-base">
              Dernières inscriptions ({CURRENT_ACADEMIC_YEAR})
            </CardTitle>
            <Link
              href="/admin/dossiers"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Voir tout
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-3.5 pt-0 pb-2.5 sm:px-4 sm:pb-3">
            {metrics.recentRegistrations.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Aucune inscription enregistrée pour le moment.
              </p>
            ) : (
              <>
                <div className="divide-y divide-border/70 md:hidden">
                  {metrics.recentRegistrations.map((reg) => (
                    <div key={reg.id} className="space-y-0.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {reg.student.user.prenom} {reg.student.user.nom}
                        </p>
                        <Badge variant="secondary" className="shrink-0 rounded-full px-2 py-0 text-[10px]">
                          {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                        </Badge>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        <span className="font-mono">{reg.student.numeroEtudiant}</span> ·{" "}
                        {reg.student.ufr.code} — {reg.student.filiere.nom}
                        {reg.payments[0]?.receiptNumber
                          ? ` · ${reg.payments[0].receiptNumber}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs">Étudiant</TableHead>
                        <TableHead className="h-8 text-xs">N° étudiant</TableHead>
                        <TableHead className="h-8 text-xs">UFR / Filière</TableHead>
                        <TableHead className="h-8 text-xs">Reçu</TableHead>
                        <TableHead className="h-8 text-right text-xs">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.recentRegistrations.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="py-1.5 text-xs font-medium">
                            {reg.student.user.prenom} {reg.student.user.nom}
                          </TableCell>
                          <TableCell className="py-1.5 font-mono text-xs">
                            {reg.student.numeroEtudiant}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs text-muted-foreground">
                            {reg.student.ufr.code} — {reg.student.filiere.nom}
                          </TableCell>
                          <TableCell className="py-1.5 font-mono text-xs">
                            {reg.payments[0]?.receiptNumber ?? "—"}
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[11px]">
                              {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                            </Badge>
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

        {/* Gestion des rôles */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="px-3.5 py-2.5 sm:px-4">
            <CardTitle className="text-sm font-semibold sm:text-base">
              Gestion des rôles utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pt-0 pb-2.5 sm:px-4 sm:pb-3">
            <div className="divide-y divide-border/70 md:hidden">
              {metrics.users.map((u) => (
                <div key={u.id} className="space-y-1.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {u.prenom} {u.nom}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 rounded-full px-2 py-0 text-[10px]">
                      {ROLE_LABELS_FR[u.role as Role]}
                    </Badge>
                  </div>
                  {u.id === adminUser.id ? (
                    <p className="text-[11px] text-muted-foreground">Compte actuel</p>
                  ) : (
                    <UpdateUserRoleForm
                      userId={u.id}
                      email={u.email}
                      defaultRole={u.role}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Nom</TableHead>
                    <TableHead className="h-8 text-xs">E-mail</TableHead>
                    <TableHead className="h-8 text-xs">Rôle</TableHead>
                    <TableHead className="h-8 text-right text-xs">Modifier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="py-1.5 text-xs font-medium">
                        {u.prenom} {u.nom}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[11px]">
                          {ROLE_LABELS_FR[u.role as Role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        {u.id === adminUser.id ? (
                          <span className="text-xs text-muted-foreground">Compte actuel</span>
                        ) : (
                          <UpdateUserRoleForm
                            userId={u.id}
                            email={u.email}
                            defaultRole={u.role}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  });
}
