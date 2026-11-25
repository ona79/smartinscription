"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { finalizeRegistrationAction } from "@/features/documents/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";

interface FinalizeRegistrationBarProps {
  registrationId: string;
}

/**
 * Barre de validation finale du dossier par l'agent :
 * - carte intégrée sur desktop ;
 * - barre fixe en bas au-dessus de la navigation sur mobile avec grandes cibles.
 */
export function FinalizeRegistrationBar({ registrationId }: FinalizeRegistrationBarProps) {
  const { formAction, isPending } = useFormActionToast(finalizeRegistrationAction);

  return (
    <>
      <Card className="rounded-xl border border-brand/30 bg-accent/40 py-0 shadow-xs">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Toutes les pièces sont approuvées
            </h2>
            <p className="text-sm text-muted-foreground">
              Vous pouvez maintenant valider définitivement l&apos;inscription de l&apos;étudiant.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <form action={formAction}>
              <input type="hidden" name="registrationId" value={registrationId} />
              <input type="hidden" name="decision" value="VALIDATED" />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Valider le dossier
              </Button>
            </form>
            <form action={formAction}>
              <input type="hidden" name="registrationId" value={registrationId} />
              <input type="hidden" name="decision" value="REJECTED" />
              <Button
                type="submit"
                disabled={isPending}
                variant="destructive"
                className="rounded-lg px-4 text-sm font-medium"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeter
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Barre fixe en bas sur mobile au-dessus de la navigation basse */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-border bg-surface/95 px-4 py-2.5 backdrop-blur-sm sm:hidden">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="decision" value="VALIDATED" />
          <Button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-brand text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Approuver
          </Button>
        </form>
        <form action={formAction} className="flex-1">
          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="decision" value="REJECTED" />
          <Button
            type="submit"
            disabled={isPending}
            variant="destructive"
            className="w-full rounded-lg text-sm font-semibold"
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Rejeter
          </Button>
        </form>
      </div>
    </>
  );
}
