"use client";

import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAppointmentStatusAction } from "@/features/rendez-vous/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";

export function AppointmentStatusButtons({ appointmentId }: { appointmentId: string }) {
  const { formAction, isPending } = useFormActionToast(updateAppointmentStatusAction);

  return (
    <div className="flex w-full gap-2 sm:inline-flex sm:w-auto sm:gap-1.5">
      <form action={formAction} className="flex-1 sm:flex-none">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="status" value="COMPLETED" />
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="w-full rounded-lg bg-brand px-3 text-[13px] text-brand-foreground hover:bg-brand-dark sm:w-auto"
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1 h-3.5 w-3.5" />
          )}
          Effectué
        </Button>
      </form>
      <form action={formAction} className="flex-1 sm:flex-none">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="status" value="NO_SHOW" />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isPending}
          className="w-full rounded-lg px-3 text-[13px] sm:w-auto"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Absent
        </Button>
      </form>
    </div>
  );
}
