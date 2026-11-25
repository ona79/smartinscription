import { Suspense } from "react";
import {
  PAYMENT_METHOD_LABELS_FR,
  ROLES,
  type PaymentMethod,
} from "@smartinscription/shared";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LazyAffluenceByUfrChart,
  LazyPaymentsByMethodChart,
  LazyPredictionsLineChart,
  LazyRegistrationsLineChart,
} from "@/features/admin/components/lazy-admin-charts";
import { getAdminStatistics } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";
import { generateIaPredictionsAction } from "@/features/ia/actions";
import { IaActionButton } from "@/features/ia/components/ia-action-button";
import { measurePerf } from "@/lib/perf";

function StatsTablesSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((idx) => (
        <Card key={idx} className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function AdminStatsContent() {
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
    .filter(
      (p) =>
        p.type === "AFFLUENCE_DOSSIERS" ||
        p.type === "AFFLUENCE_JOUR" ||
        p.type === "AFFLUENCE_HEURE"
    )
    .map((p) => ({
      label:
        p.heure !== null
          ? `${p.dateCible.toISOString().slice(5, 10)} ${String(p.heure).padStart(2, "0")}h`
          : p.dateCible.toISOString().slice(5, 10),
      valeur: p.valeur,
    }));

  return (
    <>

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
              <LazyRegistrationsLineChart data={registrationsByDay} />
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
              <LazyPaymentsByMethodChart data={paymentChartData} />
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
            <LazyAffluenceByUfrChart data={ufrChartData} />
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle className="text-base font-semibold">Effectifs par UFR</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            <div className="space-y-2 md:hidden">
              {ufrs.map((ufr) => (
                <div
                  key={ufr.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{ufr.code}</p>
                    <p className="text-sm font-medium text-foreground">{ufr.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {ufr._count.filieres} filière(s)
                    </p>
                  </div>
                  <span className="shrink-0 text-base font-semibold text-foreground">
                    {ufr._count.students}
                  </span>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
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
            </div>
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
            <LazyPredictionsLineChart data={predictionChartData} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default async function AdminStatsPage() {
  return measurePerf("page", "/admin/statistiques", async () => {
    await requireRole([ROLES.ADMIN]);

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

        <Suspense fallback={<StatsTablesSkeleton />}>
          <AdminStatsContent />
        </Suspense>
      </div>
    );
  });
}
