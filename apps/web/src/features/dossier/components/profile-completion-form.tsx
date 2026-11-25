"use client";

import { useActionState, useState } from "react";
import {
  ACADEMIC_LEVEL_LABELS_FR,
  ACADEMIC_LEVELS,
} from "@smartinscription/shared";
import { AlertCircle, GraduationCap, Hash, Loader2 } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  completeStudentProfileAction,
  type ProfileActionState,
} from "@/features/dossier/actions";
import type { UfrWithFilieres } from "@/features/dossier/queries";

interface ProfileCompletionFormProps {
  ufrs: UfrWithFilieres[];
}

const initialState: ProfileActionState = {};

/** Formulaire de complétion du profil académique avec filtrage dynamique des filières. */
export function ProfileCompletionForm({ ufrs }: ProfileCompletionFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeStudentProfileAction,
    initialState
  );
  const [selectedUfrId, setSelectedUfrId] = useState<string>(ufrs[0]?.id ?? "");

  const selectedUfr = ufrs.find((ufr) => ufr.id === selectedUfrId);
  const filieres = selectedUfr?.filieres ?? [];

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <FormField
        id="numeroEtudiant"
        name="numeroEtudiant"
        label="Numéro étudiant"
        placeholder="Ex : SN-2026-0042"
        required
        hint="Votre identifiant universitaire unique (lettres, chiffres et tirets)."
        icon={<Hash className="h-4 w-4" />}
      />

      <div className="space-y-1.5">
        <Label htmlFor="ufrId" className="text-[13px] font-medium text-foreground">
          UFR
        </Label>
        <select
          id="ufrId"
          name="ufrId"
          required
          value={selectedUfrId}
          onChange={(e) => setSelectedUfrId(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <option value="" disabled>
            Sélectionnez votre UFR
          </option>
          {ufrs.map((ufr) => (
            <option key={ufr.id} value={ufr.id}>
              {ufr.code} — {ufr.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="filiereId" className="text-[13px] font-medium text-foreground">
            Filière
          </Label>
          <select
            key={selectedUfrId}
            id="filiereId"
            name="filiereId"
            required
            defaultValue={filieres[0]?.id ?? ""}
            disabled={filieres.length === 0}
            className="flex h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
          >
            <option value="" disabled>
              Sélectionnez une filière
            </option>
            {filieres.map((filiere) => (
              <option key={filiere.id} value={filiere.id}>
                {filiere.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="niveau" className="text-[13px] font-medium text-foreground">
            Niveau
          </Label>
          <select
            id="niveau"
            name="niveau"
            required
            defaultValue="L1"
            className="flex h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {ACADEMIC_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACADEMIC_LEVEL_LABELS_FR[level]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending || ufrs.length === 0}
        className="h-10 w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement en cours...
          </>
        ) : (
          <>
            <GraduationCap className="mr-2 h-4 w-4" />
            Valider mon dossier
          </>
        )}
      </Button>
    </form>
  );
}
