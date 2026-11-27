import Link from "next/link";
import { ROLES } from "@smartinscription/shared";
import { ShieldAlert, X } from "lucide-react";
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

    const hasFilter = Boolean(params.type || (params.sort && params.sort !== "recent"));

    return (
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          title="Alertes fraude"
          description={`${alerts.length} alerte(s) affichée(s) · paiements et dossiers suspects.`}
          actions={
            <IaActionButton
              label="Lancer l'analyse IA"
              action={runIaAnomalyScanAction}
            />
          }
        />

        {/* Barre de filtres compacte */}
        <form method="GET" className="flex flex-wrap items-center gap-2">
          <select
            name="type"
            defaultValue={params.type ?? ""}
            aria-label="Filtrer par type d'alerte"
            className="h-8 flex-1 rounded-lg border border-input bg-surface px-2.5 text-xs sm:flex-none"
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
            className="h-8 flex-1 rounded-lg border border-input bg-surface px-2.5 text-xs sm:flex-none"
          >
            <option value="recent">Plus récentes / Ouvertes</option>
            <option value="score_desc">Score décroissant</option>
            <option value="score_asc">Score croissant</option>
          </select>

          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg px-3 text-xs"
          >
            Filtrer
          </Button>

          {hasFilter && (
            <Link
              href="/admin/alertes-fraude"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Réinit.
            </Link>
          )}
        </form>

        {alerts.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="Aucune alerte fraude"
            description="Aucune anomalie n'a été signalée sur les paiements ou dossiers récents."
          />
        ) : (
          <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardContent className="px-3.5 py-2 sm:px-4 sm:py-2.5">
              {/* Mobile : liste compacte */}
              <div className="divide-y divide-border/70 md:hidden">
                {alerts.map((alert) => (
                  <div key={alert.id} className="space-y-1.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-foreground">{alert.type}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge
                          variant={alert.score >= 0.7 ? "destructive" : "secondary"}
                          className="rounded-full px-1.5 py-0 text-[10px]"
                        >
                          {Math.round(alert.score * 100)}%
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            alert.resolu
                              ? "rounded-full bg-success/10 px-2 py-0 text-[10px] text-success"
                              : "rounded-full bg-amber-100 px-2 py-0 text-[10px] text-amber-800"
                          }
                        >
                          {alert.resolu ? "Résolue" : "Ouverte"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {alert.payment?.providerRef ??
                          alert.registration?.student.numeroEtudiant ??
                          "—"}
                      </p>
                      {!alert.resolu && <ResolveFraudAlertButton alertId={alert.id} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop : tableau dense */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs">Type</TableHead>
                      <TableHead className="h-8 text-xs">Score</TableHead>
                      <TableHead className="h-8 text-xs">Référence / Étudiant</TableHead>
                      <TableHead className="h-8 text-xs">État</TableHead>
                      <TableHead className="h-8 text-right text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="py-1.5 text-xs font-medium">{alert.type}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant={alert.score >= 0.7 ? "destructive" : "secondary"}
                            className="rounded-full px-2 py-0 text-[11px]"
                          >
                            {Math.round(alert.score * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                          {alert.payment?.providerRef ??
                            alert.registration?.student.numeroEtudiant ??
                            "—"}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="secondary"
                            className={
                              alert.resolu
                                ? "rounded-full bg-success/10 px-2 py-0 text-[11px] text-success"
                                : "rounded-full bg-amber-100 px-2 py-0 text-[11px] text-amber-800"
                            }
                          >
                            {alert.resolu ? "Résolue" : "Ouverte"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
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
