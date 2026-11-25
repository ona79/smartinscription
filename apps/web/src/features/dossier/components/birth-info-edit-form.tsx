"use client";

import { Calendar, Globe, Loader2, MapPin } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { updateStudentBirthInfoAction } from "@/features/dossier/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";

interface BirthInfoEditFormProps {
  birthDate: Date | string | null;
  birthPlace: string | null;
  nationality: string | null;
  disabled?: boolean;
}

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
  const { formAction, isPending, fieldErrors } = useFormActionToast(
    updateStudentBirthInfoAction
  );

  return (
    <form action={formAction} className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 [&>*]:min-w-0">
        <FormField
          id="edit-birthDate"
          name="birthDate"
          type="date"
          label="Date naissance"
          defaultValue={toDateInputValue(birthDate)}
          disabled={disabled || isPending}
          required
          error={fieldErrors.birthDate}
          className="h-9 text-sm sm:h-8"
          icon={<Calendar className="h-3.5 w-3.5" />}
        />
        <FormField
          id="edit-birthPlace"
          name="birthPlace"
          label="Lieu naissance"
          defaultValue={birthPlace ?? ""}
          placeholder="Ziguinchor"
          disabled={disabled || isPending}
          required
          error={fieldErrors.birthPlace}
          className="h-9 text-sm sm:h-8"
          icon={<MapPin className="h-3.5 w-3.5" />}
        />
        <div className="col-span-2 sm:col-span-1">
          <FormField
            id="edit-nationality"
            name="nationality"
            label="Nationalité"
            defaultValue={nationality ?? ""}
            placeholder="Sénégalaise"
            disabled={disabled || isPending}
            required
            error={fieldErrors.nationality}
            className="h-9 text-sm sm:h-8"
            icon={<Globe className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {!disabled && (
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isPending}
          className="h-8 w-full rounded-lg text-xs sm:w-auto"
        >
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Mettre à jour mes informations
        </Button>
      )}
    </form>
  );
}
