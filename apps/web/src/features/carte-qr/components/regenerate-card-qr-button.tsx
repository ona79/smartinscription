"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { regenerateCardQrAction } from "@/features/carte-qr/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";

export function RegenerateCardQrButton({
  studentId,
  registrationId,
}: {
  studentId: string;
  registrationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const { formAction, isPending } = useFormActionToast(regenerateCardQrAction, {
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg text-xs"
      >
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Régénérer le QR de la carte
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-5 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Régénérer le QR de la carte ?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              L&apos;ancien code QR d&apos;identité cessera immédiatement de fonctionner et
              l&apos;étudiant recevra une notification.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction}>
            <input type="hidden" name="studentId" value={studentId} />
            {registrationId && (
              <input type="hidden" name="registrationId" value={registrationId} />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="w-full rounded-lg sm:w-auto"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
              >
                {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Confirmer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
