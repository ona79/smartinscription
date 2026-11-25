import {
  PAYMENT_METHOD_LABELS_FR,
  ROLES,
  type PaymentMethod,
} from "@smartinscription/shared";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AffluenceByUfrChart,
  PaymentsByMethodChart,
  PredictionsLineChart,
  RegistrationsLineChart,
} from "@/features/admin/components/admin-charts";
import { getAdminStatistics } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";
import { generateIaPredictionsAction } from "@/features/ia/actions";
import { IaActionButton } from "@/features/ia/components/ia-action-button";

export default async function AdminStatsPage() {
  await requireRole([ROLES.ADMIN]);
  const { ufrs, paymentsByMethod, predictions, registrationsByDay } =
    await getAdminStatistics();

  const paymentChartData = paymentsByMethod.map((row) => ({
    method: PAYMENT_METHOD_LABELS_FR[row.moyen as PaymentMethod],
    count: row._count.id,
  }));

  const ufrChartData = ufrs.map((u) => ({
    code: u.code,
    students: u._count.students,
  }));

  const predictionChartData = predictions
    .filter((p) => p.type === "AFFLUENCE_DOSSIERS" || p.type === "AFFLUENCE_JOUR" || p.type === "AFFLUENCE_HEURE")
    .map((p) => ({
      label:
        p.heure !== null
          ? `${p.dateCible.toISOString().slice(5, 10)} ${String(p.heure).padStart(2, "0")}h`
          : p.dateCible.toISOString().slice(5, 10),
      valeur: p.valeur,
    }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Statistiques & prédictions IA"
        description="Répartition par UFR, paiements par moyen, courbes d'affluence et prévisions."
        actions={
          <IaActionButton
            label="Générer prévisions IA (7j)"
            action={generateIaPredictionsAction}
          />
        }
      />

      {/* Graphiques Recharts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold">Inscriptions par jour</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {registrationsByDay.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-muted-foreground">
                Pas encore de données d&apos;inscription.
              </p>
            ) : (
              <RegistrationsLineChart data={registrationsByDay} />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold">Paiements par moyen</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {paymentChartData.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-muted-foreground">
                Aucun paiement confirmé pour le moment.
              </p>
            ) : (
              <PaymentsByMethodChart data={paymentChartData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tableaux & Graphique UFR */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold">Affluence par UFR</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <AffluenceByUfrChart data={ufrChartData} />
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">Effectifs par UFR</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>UFR</TableHead>
                  <TableHead className="text-right">Filières</TableHead>
                  <TableHead className="text-right">Étudiants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ufrs.map((ufr) => (
                  <TableRow key={ufr.id}>
                    <TableCell className="font-mono text-xs">{ufr.code}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium" title={ufr.nom}>
                      {ufr.nom}
                    </TableCell>
                    <TableCell className="text-right">{ufr._count.filieres}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {ufr._count.students}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Prévisions IA */}
      {predictionChartData.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Aucune prédiction IA disponible"
          description="Cliquez sur « Générer prévisions IA (7j) » pour calculer l'affluence et les besoins en personnel."
        />
      ) : (
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold">
              Courbe des prévisions IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <PredictionsLineChart data={predictionChartData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
