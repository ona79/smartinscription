import Link from "next/link";
import { CheckCircle2, QrCode, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VerificationResult } from "@/features/scan/services/verification-service";
import { cn } from "@/lib/utils";

interface VerificationResultCardProps {
  result: VerificationResult;
  onScanAnother?: () => void;
}

/** Carte lisible affichant le résultat de la vérification d'un reçu QR. */
export function VerificationResultCard({
  result,
  onScanAnother,
}: VerificationResultCardProps) {
  if (!result.valid) {
    return (
      <Card className="rounded-2xl border-destructive/40 bg-surface shadow-none">
        <CardContent className="flex flex-col items-center space-y-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <XCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <Badge variant="destructive" className="rounded-full px-3 py-0.5 text-xs">
              Invalide
            </Badge>
            <h2 className="pt-2 text-lg font-bold text-foreground">
              Vérification échouée
            </h2>
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </div>
          {onScanAnother ? (
            <Button
              type="button"
              onClick={onScanAnother}
              className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner un autre
            </Button>
          ) : (
            <Link
              href="/agent/scan"
              className={cn(
                buttonVariants({ size: "default" }),
                "h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              )}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner un autre
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const paidDate = new Date(result.paidAt).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card className="rounded-2xl border-success/40 bg-surface shadow-none">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{result.studentName}</h2>
              <p className="font-mono text-xs text-muted-foreground">
                {result.numeroEtudiant} · {result.anneeAcademique}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white">
              Paiement valide
            </Badge>
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                result.dossierState === "VALIDATED" || result.dossierState === "COMPLETE"
                  ? "bg-accent text-accent-foreground"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {result.registrationStatusLabel}
            </Badge>
          </div>
        </div>

        <dl className="grid gap-4 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">UFR</dt>
            <dd className="mt-0.5 font-semibold text-foreground">{result.ufrNom}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Filière & Niveau</dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {result.filiereNom} ({result.niveau})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Paiement effectué</dt>
            <dd className="mt-0.5 font-semibold text-success">
              Oui — {result.montant.toLocaleString("fr-FR")} FCFA
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date & N° de reçu</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {paidDate} · <span className="font-mono">{result.receiptNumber}</span>
            </dd>
          </div>
        </dl>

        <div className="flex justify-end">
          {onScanAnother ? (
            <Button
              type="button"
              onClick={onScanAnother}
              className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner un autre
            </Button>
          ) : (
            <Link
              href="/agent/scan"
              className={cn(
                buttonVariants({ size: "default" }),
                "h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              )}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner un autre
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
