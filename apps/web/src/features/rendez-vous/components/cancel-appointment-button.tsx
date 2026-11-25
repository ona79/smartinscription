"use client";

import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAppointmentAction } from "@/features/rendez-vous/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";

export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const { formAction, isPending } = useFormActionToast(cancelAppointmentAction);

  return (
    <form action={formAction} className="w-full sm:w-auto">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isPending}
        className="w-full rounded-lg px-4 text-xs font-semibold text-destructive hover:bg-destructive/5 sm:w-auto"
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="mr-1.5 h-4 w-4" />
        )}
        Annuler le rendez-vous
      </Button>
    </form>
  );
}
