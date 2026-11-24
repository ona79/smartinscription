import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUS_LABELS_FR,
  ROLE_LABELS_FR,
  ROLES,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
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
import { getAdminDashboardMetrics } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";

export default async function AdminDashboardPage() {
  const adminUser = await requireRole([ROLES.ADMIN]);
  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Tableau de bord administrateur"
        description={`Suivi global des inscriptions et des encaissements (${CURRENT_ACADEMIC_YEAR}).`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Étudiants inscrits"
          value={metrics.totalStudents}
          description="Profils académiques créés"
          icon={GraduationCap}
        />
        <StatCard
          title="Encaissements"
          value={`${metrics.totalRevenueFcfa.toLocaleString("fr-FR")} FCFA`}
          description={`${metrics.paidCount} paiement(s) confirmé(s)`}
          icon={Banknote}
        />
        <StatCard
          title="Dossiers validés"
          value={metrics.validatedCount}
          description={`Année ${CURRENT_ACADEMIC_YEAR}`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Alertes fraude ouvertes"
          value={metrics.unresolvedFraudCount}
          description="À traiter dans Alertes fraude"
          icon={AlertTriangle}
        />
      </div>

      {/* Dernières inscriptions */}
      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Dernières inscriptions ({CURRENT_ACADEMIC_YEAR})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentRegistrations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
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
                  <TableHead>Statut</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground">
                      {reg.student.ufr.code} — {reg.student.filiere.nom}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {reg.payments[0]?.receiptNumber ?? "—"}
                    </TableCell>
                    <TableCell>
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
      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Gestion des rôles utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
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
                          className="h-8 rounded-lg border border-input bg-surface px-2 text-xs"
                        >
                          <option value={ROLES.STUDENT}>Étudiant</option>
                          <option value={ROLES.AGENT}>Agent</option>
                          <option value={ROLES.ADMIN}>Administrateur</option>
                        </select>
                        <Button type="submit" size="sm" variant="outline" className="h-8 rounded-lg text-xs">
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
