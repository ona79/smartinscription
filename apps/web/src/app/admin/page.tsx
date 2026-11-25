import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUS_LABELS_FR,
  ROLE_LABELS_FR,
  ROLES,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import {
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
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title="Tableau de bord administrateur"
          description={`Suivi des inscriptions et encaissements (${CURRENT_ACADEMIC_YEAR}).`}
          actions={<AutoRefresh intervalMs={30_000} />}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            title="Étudiants inscrits"
            value={metrics.totalStudents}
            description="Profils créés"
            icon={GraduationCap}
          />
          <StatCard
            title="Transactions réussies"
            value={metrics.paidCount}
            description={`${metrics.unresolvedFraudCount} alerte(s)`}
            icon={CreditCard}
          />
          <StatCard
            title="Recettes encaissées"
            value={`${metrics.totalRevenueFcfa.toLocaleString("fr-FR")} FCFA`}
            description={`Année ${CURRENT_ACADEMIC_YEAR}`}
            icon={Banknote}
          />
          <StatCard
            title="File active du jour"
            value={metrics.activeQueueCount}
            description={`${metrics.paidNotValidatedCount} à valider · ${metrics.todayAppointmentsCount} RDV`}
            icon={Clock}
          />
        </div>

        {/* Dernières inscriptions */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle className="text-base font-semibold">
              Dernières inscriptions ({CURRENT_ACADEMIC_YEAR})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            {metrics.recentRegistrations.length === 0 ? (
              <p className="py-5 text-center text-[13px] text-muted-foreground">
                Aucune inscription enregistrée pour le moment.
              </p>
            ) : (
              <>
                <div className="space-y-2.5 md:hidden">
                  {metrics.recentRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="space-y-1.5 rounded-xl border border-border bg-background/50 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {reg.student.user.prenom} {reg.student.user.nom}
                        </p>
                        <Badge variant="secondary" className="rounded-full text-[11px]">
                          {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {reg.student.numeroEtudiant}
                        {reg.payments[0]?.receiptNumber
                          ? ` · Reçu ${reg.payments[0].receiptNumber}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reg.student.ufr.code} — {reg.student.filiere.nom}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Étudiant</TableHead>
                        <TableHead>N° étudiant</TableHead>
                        <TableHead>UFR / Filière</TableHead>
                        <TableHead>Reçu</TableHead>
                        <TableHead className="text-right">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.recentRegistrations.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            {reg.student.user.prenom} {reg.student.user.nom}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {reg.student.numeroEtudiant}
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {reg.student.ufr.code} — {reg.student.filiere.nom}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {reg.payments[0]?.receiptNumber ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="rounded-full text-xs">
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
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle className="text-base font-semibold">
              Gestion des rôles utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            <div className="space-y-2.5 md:hidden">
              {metrics.users.map((u) => (
                <div
                  key={u.id}
                  className="space-y-2.5 rounded-xl border border-border bg-background/50 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {u.prenom} {u.nom}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 rounded-full text-[11px]">
                      {ROLE_LABELS_FR[u.role as Role]}
                    </Badge>
                  </div>
                  {u.id === adminUser.id ? (
                    <p className="text-xs text-muted-foreground">Compte actuel</p>
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
                    <TableHead>Nom</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Rôle actuel</TableHead>
                    <TableHead className="text-right">Modifier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.prenom} {u.nom}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full text-xs">
                          {ROLE_LABELS_FR[u.role as Role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
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
