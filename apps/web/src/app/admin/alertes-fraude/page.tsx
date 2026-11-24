import { ROLES } from "@smartinscription/shared";
import { CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
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

export default async function AdminFraudAlertsPage() {
  await requireRole([ROLES.ADMIN]);
  const alerts = await getAdminFraudAlerts();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Alertes fraude"
        description="Surveillance des anomalies de paiement et de dossiers suspects."
        actions={
          <form action={runIaAnomalyScanAction}>
            <Button
              type="submit"
              className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Lancer l&apos;analyse IA
            </Button>
          </form>
        }
      />

      {alerts.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Aucune alerte fraude"
          description="Aucune anomalie n'a été signalée sur les paiements ou dossiers récents."
        />
      ) : (
        <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
          <CardContent className="p-4 sm:p-6">
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
                            className="h-8 rounded-lg text-xs"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Marquer résolue
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
}
