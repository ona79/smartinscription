"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  bookAppointmentAction,
  type AppointmentActionState,
} from "@/features/rendez-vous/actions";
import type { AvailableSlot } from "@/features/rendez-vous/services/appointment-service";
import { cn } from "@/lib/utils";

interface SlotPickerProps {
  slots: AvailableSlot[];
}

const initialState: AppointmentActionState = {};

/** Sélecteur de créneaux horaires groupés par jour ouvré. */
export function SlotPicker({ slots }: SlotPickerProps) {
  const [state, formAction, isPending] = useActionState(
    bookAppointmentAction,
    initialState
  );
  const [selectedIso, setSelectedIso] = useState<string>(slots[0]?.startIso ?? "");

  const groupedByDay = slots.reduce<Record<string, AvailableSlot[]>>((acc, slot) => {
    if (!acc[slot.dayLabel]) acc[slot.dayLabel] = [];
    acc[slot.dayLabel].push(slot);
    return acc;
  }, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <input type="hidden" name="startIso" value={selectedIso} />

      <div className="space-y-5">
        {Object.entries(groupedByDay).map(([dayLabel, daySlots]) => (
          <div key={dayLabel} className="space-y-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold capitalize text-foreground">
              <Calendar className="h-4 w-4 text-brand" />
              {dayLabel}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {daySlots.map((slot) => {
                const isSelected = selectedIso === slot.startIso;
                return (
                  <button
                    key={slot.startIso}
                    type="button"
                    onClick={() => setSelectedIso(slot.startIso)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors",
                      isSelected
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-surface text-foreground hover:border-brand/50"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {slot.timeLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button
        type="submit"
        disabled={isPending || !selectedIso}
        className="h-11 w-full rounded-xl bg-brand text-sm font-semibold text-brand-foreground hover:bg-brand-dark sm:w-auto sm:px-6"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Réservation en cours...
          </>
        ) : (
          "Confirmer le rendez-vous"
        )}
      </Button>
    </form>
  );
}
