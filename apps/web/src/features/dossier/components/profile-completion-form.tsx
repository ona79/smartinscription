"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACADEMIC_LEVEL_LABELS_FR,
  ACADEMIC_LEVELS,
  DOCUMENT_TYPES,
} from "@smartinscription/shared";
import {
  AlertCircle,
  Calendar,
  Globe,
  GraduationCap,
  Hash,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhotoUploader } from "@/features/documents/components/photo-uploader";
import { uploadDocumentViaActiveStorage } from "@/features/documents/lib/client-upload";
import { completeStudentProfileAction } from "@/features/dossier/actions";
import type { UfrWithFilieres } from "@/features/dossier/queries";
import { notifyActionResult } from "@/hooks/use-action-toast";
import type { FieldErrors } from "@/lib/action-result";
import { MESSAGES } from "@/lib/messages";

interface ProfileCompletionFormProps {
  ufrs: UfrWithFilieres[];
}

/**
 * Formulaire de complétion du profil académique + état civil + photo optionnelle
 * (envoi en deux temps : création du dossier puis upload photo avec reprise possible).
 */
export function ProfileCompletionForm({ ufrs }: ProfileCompletionFormProps) {
  const router = useRouter();
  const [selectedUfrId, setSelectedUfrId] = useState<string>(ufrs[0]?.id ?? "");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dossierCreated, setDossierCreated] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const selectedUfr = ufrs.find((ufr) => ufr.id === selectedUfrId);
  const filieres = selectedUfr?.filieres ?? [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});
    setPhotoError(null);

    const formData = new FormData(event.currentTarget);
    const res = await completeStudentProfileAction(null, formData);

    if (!res.ok) {
      setError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
      notifyActionResult(res);
      setIsSubmitting(false);
      return;
    }

    setDossierCreated(true);

    if (selectedPhoto) {
      const uploadRes = await uploadDocumentViaActiveStorage(
        DOCUMENT_TYPES.PHOTO,
        selectedPhoto
      );
      if (!uploadRes.ok) {
        setPhotoError(uploadRes.error);
        notifyActionResult(uploadRes);
        setIsSubmitting(false);
        return;
      }
    }

    notifyActionResult({ ok: true, message: MESSAGES.dossier.profileSuccess });
    router.push("/etudiant");
    router.refresh();
  }

  async function handleRetryPhoto() {
    if (!selectedPhoto || isSubmitting) return;
    setIsSubmitting(true);
    setPhotoError(null);
    const uploadRes = await uploadDocumentViaActiveStorage(
      DOCUMENT_TYPES.PHOTO,
      selectedPhoto
    );
    setIsSubmitting(false);
    notifyActionResult(uploadRes);
    if (!uploadRes.ok) {
      setPhotoError(uploadRes.error);
      return;
    }
    router.push("/etudiant");
    router.refresh();
  }

  if (dossierCreated && photoError) {
    return (
      <div className="space-y-4">
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Votre dossier a bien été créé, mais la photo n&apos;a pas pu être envoyée :{" "}
            {photoError}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleRetryPhoto}
            className="h-10 rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Réessayer l&apos;envoi de la photo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              router.push("/etudiant");
              router.refresh();
            }}
            className="h-10 rounded-lg text-sm"
          >
            Continuer sans photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <FormField
        id="numeroEtudiant"
        name="numeroEtudiant"
        label="Numéro étudiant"
        placeholder="Ex : SN-2026-0042"
        required
        error={fieldErrors.numeroEtudiant}
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
          className="flex h-11 w-full rounded-lg border border-input bg-surface px-3 text-base text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-10 sm:text-sm"
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
            className="flex h-11 w-full rounded-lg border border-input bg-surface px-3 text-base text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 sm:h-10 sm:text-sm"
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
          {fieldErrors.filiereId && (
            <p className="text-xs font-medium text-destructive">{fieldErrors.filiereId}</p>
          )}
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
            className="flex h-11 w-full rounded-lg border border-input bg-surface px-3 text-base text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-10 sm:text-sm"
          >
            {ACADEMIC_LEVELS.map((level) => (
              <option key={level} value={level}>
                {ACADEMIC_LEVEL_LABELS_FR[level]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField
          id="birthDate"
          name="birthDate"
          type="date"
          label="Date de naissance"
          required
          error={fieldErrors.birthDate}
          icon={<Calendar className="h-4 w-4" />}
        />
        <FormField
          id="birthPlace"
          name="birthPlace"
          label="Lieu de naissance"
          placeholder="Ex : Ziguinchor"
          required
          error={fieldErrors.birthPlace}
          icon={<MapPin className="h-4 w-4" />}
        />
        <FormField
          id="nationality"
          name="nationality"
          label="Nationalité"
          placeholder="Ex : Sénégalaise"
          defaultValue="Sénégalaise"
          required
          error={fieldErrors.nationality}
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-[13px] font-medium text-foreground">
          Photo d&apos;identité (optionnelle à cette étape)
        </p>
        <p className="text-xs text-muted-foreground">
          Visage dégagé, fond uni, cadrage portrait. Elle apparaîtra sur votre carte étudiante numérique.
        </p>
        <PhotoUploader
          mode="deferred"
          fullWidthMobile
          label="Ajouter une photo"
          onFileSelected={(file) => setSelectedPhoto(file)}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || ufrs.length === 0}
        className="h-10 w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
      >
        {isSubmitting ? (
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
