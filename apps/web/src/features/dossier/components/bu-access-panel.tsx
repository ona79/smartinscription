"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setBuStatusAction } from "@/features/dossier/actions";
import { useActionToast } from "@/hooks/use-action-toast";

interface BuAccessPanelProps {
  registrationId: string;
  buStatus: "NONE" | "ACTIVE";
  buValidatedAt: Date | string | null;
  buValidatedByName: string | null;
  isPaymentConfirmed: boolean;
}

/** Panneau agent/admin pour activer ou désactiver l'accès BU avec confirmation. */
export function BuAccessPanel({
  registrationId,
  buStatus,
  buValidatedAt,
  buValidatedByName,
  isPaymentConfirmed,
}: BuAccessPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { run, isPending } = useActionToast(setBuStatusAction, {
    onSuccess: () => setConfirmOpen(false),
  });

  const isActive = buStatus === "ACTIVE";
  const nextStatus = isActive ? "NONE" : "ACTIVE";
  const formattedDate = buValidatedAt
    ? new Date(buValidatedAt).toLocaleDateString("fr-FR", { timeZone: "UTC" })
    : null;

  return (
    <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2 sm:p-5 sm:pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-brand" />
          <CardTitle className="text-base font-semibold">
            Bibliothèque universitaire (BU)
          </CardTitle>
        </div>
        <Badge
          variant="secondary"
          className={
            isActive
              ? "rounded-full bg-success/10 text-success"
              : "rounded-full bg-muted text-muted-foreground"
          }
        >
          {isActive ? "Active" : "Non activé"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-1 sm:p-5 sm:pt-1">
        {isActive ? (
          <p className="text-xs text-muted-foreground">
            Activé{formattedDate ? ` le ${formattedDate}` : ""}
            {buValidatedByName ? ` par ${buValidatedByName}` : ""}.
          </p>
        ) : !isPaymentConfirmed ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              L&apos;accès BU ne peut être activé qu&apos;après confirmation du paiement.
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Le paiement est confirmé : vous pouvez activer l&apos;accès BU de l&apos;étudiant.
          </p>
        )}

        <Button
          type="button"
          variant={isActive ? "outline" : "default"}
          size="sm"
          disabled={isPending || (!isActive && !isPaymentConfirmed)}
          onClick={() => setConfirmOpen(true)}
          className={
            isActive
              ? "w-full rounded-lg sm:w-auto"
              : "w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
          }
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          {isActive ? "Désactiver l'accès BU" : "Activer l'accès BU"}
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="p-5 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                {isActive ? "Désactiver l'accès BU ?" : "Activer l'accès BU ?"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isActive
                  ? "L'étudiant n'aura plus la mention « Active » sur sa carte pour cette année."
                  : "La mention « Active » apparaîtra au verso de sa carte étudiante et une notification lui sera envoyée."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={isPending}
                className="w-full rounded-lg sm:w-auto"
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant={isActive ? "destructive" : "default"}
                disabled={isPending}
                onClick={() => run(registrationId, nextStatus)}
                className={
                  isActive
                    ? "w-full rounded-lg sm:w-auto"
                    : "w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
                }
              >
                {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
