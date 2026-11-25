import { ROLES } from "@smartinscription/shared";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveFraudAlertAction } from "@/features/admin/actions";
import { getAdminFraudAlerts } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";
import { runIaAnomalyScanAction } from "@/features/ia/actions";
import { IaActionButton } from "@/features/ia/components/ia-action-button";
import { measurePerf } from "@/lib/perf";

interface AdminFraudAlertsPageProps {
  searchParams: Promise<{ type?: string; sort?: string }>;
}

export default async function AdminFraudAlertsPage({
  searchParams,
}: AdminFraudAlertsPageProps) {
  return measurePerf("page", "/admin/alertes-fraude", async () => {
    await requireRole([ROLES.ADMIN]);
    const params = await searchParams;
    const { alerts, types } = await getAdminFraudAlerts({
      type: params.type,
      sort: params.sort,
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertes fraude"
        description="Surveillance des anomalies de paiement et de dossiers suspects."
        actions={
          <IaActionButton
            label="Lancer l'analyse IA"
            action={runIaAnomalyScanAction}
          />
        }
      />

      {/* Filtres & Tri */}
      <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
        <CardContent className="p-4">
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <select
              name="type"
              defaultValue={params.type ?? ""}
              aria-label="Filtrer par type d'alerte"
              className="h-9 rounded-lg border border-input bg-surface px-3 text-[13px]"
            >
              <option value="">Tous les types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              name="sort"
              defaultValue={params.sort ?? "recent"}
              aria-label="Trier les alertes"
              className="h-9 rounded-lg border border-input bg-surface px-3 text-[13px]"
            >
              <option value="recent">Plus récentes / Ouvertes</option>
              <option value="score_desc">Score décroissant</option>
              <option value="score_asc">Score croissant</option>
            </select>

            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-9 rounded-lg px-3.5 text-[13px]"
            >
              Appliquer
            </Button>
          </form>
        </CardContent>
      </Card>

      {alerts.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Aucune alerte fraude"
          description="Aucune anomalie n'a été signalée sur les paiements ou dossiers récents."
        />
      ) : (
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardContent className="p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Référence / Étudiant</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={alert.score >= 0.7 ? "destructive" : "secondary"}
                        className="rounded-full text-xs"
                      >
                        {Math.round(alert.score * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {alert.payment?.providerRef ??
                        alert.registration?.student.numeroEtudiant ??
                        "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          alert.resolu
                            ? "rounded-full bg-success/10 text-success"
                            : "rounded-full bg-amber-100 text-amber-800"
                        }
                      >
                        {alert.resolu ? "Résolue" : "Ouverte"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!alert.resolu && (
                        <form action={resolveFraudAlertAction}>
                          <input type="hidden" name="alertId" value={alert.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-lg text-[13px]"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Marquer comme résolue
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
      )}
    </div>
  );
  });
}
