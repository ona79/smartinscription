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
import { getAdminStatistics } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";

export default async function AdminStatsPage() {
  await requireRole([ROLES.ADMIN]);
  const { ufrs, paymentsByMethod, predictions } = await getAdminStatistics();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Statistiques & prédictions IA"
        description="Répartition des effectifs par UFR, encaissements par moyen de paiement et prévisions."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Effectifs par UFR</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>UFR</TableHead>
                  <TableHead>Filières</TableHead>
                  <TableHead className="text-right">Étudiants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ufrs.map((ufr) => (
                  <TableRow key={ufr.id}>
                    <TableCell className="font-mono text-xs">{ufr.code}</TableCell>
                    <TableCell className="font-medium">{ufr.nom}</TableCell>
                    <TableCell>{ufr._count.filieres}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {ufr._count.students}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Paiements réussis par moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsByMethod.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucun paiement confirmé pour le moment.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Moyen</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsByMethod.map((row) => (
                    <TableRow key={row.moyen}>
                      <TableCell className="font-medium">
                        {PAYMENT_METHOD_LABELS_FR[row.moyen as PaymentMethod]}
                      </TableCell>
                      <TableCell>{row._count.id}</TableCell>
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
          description="Les prévisions d'affluence apparaîtront ici dès l'activation du module IA."
        />
      ) : (
        <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Prédictions récentes</CardTitle>
          </CardHeader>
          <CardContent>
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
