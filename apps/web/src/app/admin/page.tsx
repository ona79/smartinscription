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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateUserRoleAction } from "@/features/admin/actions";
import { AutoRefresh } from "@/features/admin/components/auto-refresh";
import { getAdminDashboardMetrics } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";

export default async function AdminDashboardPage() {
  const adminUser = await requireRole([ROLES.ADMIN]);
  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tableau de bord administrateur"
        description={`Suivi des inscriptions et encaissements (${CURRENT_ACADEMIC_YEAR}).`}
        actions={<AutoRefresh intervalMs={30_000} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Étudiants inscrits"
          value={metrics.totalStudents}
          description="Profils académiques créés"
          icon={GraduationCap}
        />
        <StatCard
          title="Transactions réussies"
          value={metrics.paidCount}
          description={`${metrics.unresolvedFraudCount} alerte(s) ouverte(s)`}
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
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold">
            Dernières inscriptions ({CURRENT_ACADEMIC_YEAR})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {metrics.recentRegistrations.length === 0 ? (
            <p className="py-5 text-center text-[13px] text-muted-foreground">
              Aucune inscription enregistrée pour le moment.
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Gestion des rôles */}
      <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold">
            Gestion des rôles utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
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
                      <form
                        action={updateUserRoleAction}
                        className="inline-flex items-center gap-2"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          aria-label={`Rôle pour ${u.email}`}
                          className="h-9 rounded-lg border border-input bg-surface px-2.5 text-[13px]"
                        >
                          <option value={ROLES.STUDENT}>Étudiant</option>
                          <option value={ROLES.AGENT}>Agent</option>
                          <option value={ROLES.ADMIN}>Administrateur</option>
                        </select>
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-lg text-[13px]"
                        >
                          Appliquer
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
