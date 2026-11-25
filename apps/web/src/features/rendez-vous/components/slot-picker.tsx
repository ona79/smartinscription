"use client";

import { useState } from "react";
import { AlertCircle, Calendar, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookAppointmentAction } from "@/features/rendez-vous/actions";
import type { AvailableSlot } from "@/features/rendez-vous/services/appointment-service";
import { useFormActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";

interface SlotPickerProps {
  slots: AvailableSlot[];
}

/** Sélecteur de créneaux : jours en puces défilables, grille 3 colonnes sur mobile, barre collée en bas. */
export function SlotPicker({ slots }: SlotPickerProps) {
  const { state, formAction, isPending } = useFormActionToast(bookAppointmentAction);

  const groupedByDay = slots.reduce<Record<string, AvailableSlot[]>>((acc, slot) => {
    if (!acc[slot.dayLabel]) acc[slot.dayLabel] = [];
    acc[slot.dayLabel].push(slot);
    return acc;
  }, {});

  const dayKeys = Object.keys(groupedByDay);
  const [selectedDay, setSelectedDay] = useState<string>(dayKeys[0] ?? "");
  const daySlots = groupedByDay[selectedDay] ?? [];

  const [selectedIso, setSelectedIso] = useState<string>(daySlots[0]?.startIso ?? "");
  const activeSlot = slots.find((s) => s.startIso === selectedIso);

  function handleSelectDay(day: string) {
    setSelectedDay(day);
    const firstOfDay = groupedByDay[day]?.[0]?.startIso ?? "";
    setSelectedIso(firstOfDay);
  }

  function handleSuggestLeastLoaded() {
    if (slots.length === 0) return;
    const best = slots.reduce((min, cur) =>
      cur.loadScore < min.loadScore ? cur : min
    );
    setSelectedDay(best.dayLabel);
    setSelectedIso(best.startIso);
  }

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <input type="hidden" name="startIso" value={selectedIso} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">
          Les créneaux marqués d&apos;un point vert sont les moins chargés.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggestLeastLoaded}
          className="w-full rounded-lg px-3 text-[13px] sm:w-auto"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-brand" />
          Me proposer un créneau
        </Button>
      </div>

      {/* Puces de jours défilables horizontalement */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dayKeys.map((dayLabel) => {
          const isCurrentDay = selectedDay === dayLabel;
          return (
            <button
              key={dayLabel}
              type="button"
              onClick={() => handleSelectDay(dayLabel)}
              className={cn(
                "min-h-11 shrink-0 rounded-lg border px-3 text-[13px] font-medium capitalize transition-colors sm:min-h-9",
                isCurrentDay
                  ? "border-brand bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {dayLabel}
            </button>
          );
        })}
      </div>

      {/* Grille de créneaux : 3 colonnes sur mobile, 6 sur desktop */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {daySlots.map((slot) => {
          const isSelected = selectedIso === slot.startIso;
          return (
            <button
              key={slot.startIso}
              type="button"
              onClick={() => setSelectedIso(slot.startIso)}
              aria-pressed={isSelected}
              title={slot.recommended ? "Créneau recommandé (moins chargé)" : undefined}
              className={cn(
                "relative flex min-h-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors sm:min-h-9",
                isSelected
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-surface text-foreground hover:border-brand/50"
              )}
            >
              {slot.timeLabel}
              {slot.recommended && !isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Barre de confirmation collée au-dessus de la barre de navigation sur mobile */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-xl border border-border bg-surface/95 p-3.5 shadow-sm backdrop-blur-sm sm:static sm:flex-row sm:items-center sm:justify-between sm:bg-muted/30 sm:shadow-none">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Calendar className="h-4 w-4 shrink-0 text-brand" />
          {activeSlot ? (
            <span>
              Créneau choisi :{" "}
              <strong className="capitalize">
                {activeSlot.dayLabel} à {activeSlot.timeLabel}
              </strong>
            </span>
          ) : (
            <span className="text-muted-foreground">Sélectionnez un créneau</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending || !selectedIso}
          className="w-full shrink-0 rounded-lg bg-brand px-5 text-sm font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirmation...
            </>
          ) : (
            "Confirmer"
          )}
        </Button>
      </div>
    </form>
  );
}
