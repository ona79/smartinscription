import {
  PAYMENT_METHOD_LABELS_FR,
  ROLES,
  type PaymentMethod,
} from "@smartinscription/shared";
import { BarChart3, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
import { getAdminStatistics } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";
import { generateIaPredictionsAction } from "@/features/ia/actions";

export default async function AdminStatsPage() {
  await requireRole([ROLES.ADMIN]);
  const { ufrs, paymentsByMethod, predictions } = await getAdminStatistics();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Statistiques & prédictions IA"
        description="Répartition des effectifs par UFR, encaissements par moyen de paiement et prévisions."
        actions={
          <form action={generateIaPredictionsAction}>
            <Button
              type="submit"
              className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Générer prévisions IA (7j)
            </Button>
          </form>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
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

        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">
              Paiements réussis par moyen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {paymentsByMethod.length === 0 ? (
              <p className="py-5 text-center text-[13px] text-muted-foreground">
                Aucun paiement confirmé pour le moment.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Moyen</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsByMethod.map((row) => (
                    <TableRow key={row.moyen}>
                      <TableCell className="font-medium">
                        {PAYMENT_METHOD_LABELS_FR[row.moyen as PaymentMethod]}
                      </TableCell>
                      <TableCell className="text-right">{row._count.id}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {(row._sum.montant ?? 0).toLocaleString("fr-FR")} FCFA
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {predictions.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Aucune prédiction IA disponible"
          description="Cliquez sur « Générer prévisions IA (7j) » pour calculer l'affluence et les besoins en personnel."
        />
      ) : (
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">Prédictions récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date cible</TableHead>
                  <TableHead className="text-right">Valeur prédite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.map((pred) => (
                  <TableRow key={pred.id}>
                    <TableCell className="font-medium">{pred.type}</TableCell>
                    <TableCell>{pred.dateCible.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-right font-semibold">{pred.valeur}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
