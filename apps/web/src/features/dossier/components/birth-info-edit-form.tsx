"use client";

import { useActionState } from "react";
import { Calendar, Check, Globe, Loader2, MapPin } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  updateStudentBirthInfoAction,
  type ProfileActionState,
} from "@/features/dossier/actions";

interface BirthInfoEditFormProps {
  birthDate: Date | string | null;
  birthPlace: string | null;
  nationality: string | null;
  disabled?: boolean;
}

const initialState: ProfileActionState = {};

function toDateInputValue(value: Date | string | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Formulaire de mise à jour des informations de naissance tant que le dossier n'est pas validé. */
export function BirthInfoEditForm({
  birthDate,
  birthPlace,
  nationality,
  disabled = false,
}: BirthInfoEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateStudentBirthInfoAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField
          id="edit-birthDate"
          name="birthDate"
          type="date"
          label="Date de naissance"
          defaultValue={toDateInputValue(birthDate)}
          disabled={disabled || isPending}
          required
          icon={<Calendar className="h-4 w-4" />}
        />
        <FormField
          id="edit-birthPlace"
          name="birthPlace"
          label="Lieu de naissance"
          defaultValue={birthPlace ?? ""}
          placeholder="Ex : Ziguinchor"
          disabled={disabled || isPending}
          required
          icon={<MapPin className="h-4 w-4" />}
        />
        <FormField
          id="edit-nationality"
          name="nationality"
          label="Nationalité"
          defaultValue={nationality ?? ""}
          placeholder="Ex : Sénégalaise"
          disabled={disabled || isPending}
          required
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="flex items-center gap-1 text-xs font-medium text-success">
          <Check className="h-3.5 w-3.5" />
          {state.success}
        </p>
      )}

      {!disabled && (
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isPending}
          className="h-9 rounded-lg text-[13px]"
        >
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Mettre à jour mes informations
        </Button>
      )}
    </form>
  );
}
