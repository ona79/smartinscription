import { ROLES } from "@smartinscription/shared";
import { ShieldAlert } from "lucide-react";
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
import { ResolveFraudAlertButton } from "@/features/admin/components/admin-row-actions";
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
      <div className="space-y-4 sm:space-y-5">
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
            <form method="GET" className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <select
                name="type"
                defaultValue={params.type ?? ""}
                aria-label="Filtrer par type d'alerte"
                className="h-11 rounded-lg border border-input bg-surface px-3 text-base sm:h-9 sm:text-[13px]"
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
                className="h-11 rounded-lg border border-input bg-surface px-3 text-base sm:h-9 sm:text-[13px]"
              >
                <option value="recent">Plus récentes / Ouvertes</option>
                <option value="score_desc">Score décroissant</option>
                <option value="score_asc">Score croissant</option>
              </select>

              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="w-full rounded-lg px-3.5 text-[13px] sm:w-auto"
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
            <CardContent className="p-4 sm:p-5">
              {/* Mobile : liste de cartes */}
              <div className="space-y-2.5 md:hidden">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="space-y-2.5 rounded-xl border border-border bg-background/50 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{alert.type}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={alert.score >= 0.7 ? "destructive" : "secondary"}
                          className="rounded-full text-[11px]"
                        >
                          {Math.round(alert.score * 100)}%
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            alert.resolu
                              ? "rounded-full bg-success/10 text-success text-[11px]"
                              : "rounded-full bg-amber-100 text-amber-800 text-[11px]"
                          }
                        >
                          {alert.resolu ? "Résolue" : "Ouverte"}
                        </Badge>
                      </div>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {alert.payment?.providerRef ??
                        alert.registration?.student.numeroEtudiant ??
                        "—"}
                    </p>
                    {!alert.resolu && <ResolveFraudAlertButton alertId={alert.id} />}
                  </div>
                ))}
              </div>

              {/* Desktop : tableau */}
              <div className="hidden md:block">
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
                          {!alert.resolu && <ResolveFraudAlertButton alertId={alert.id} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  });
}
