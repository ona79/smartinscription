"use client";

import { useState } from "react";
import {
  ACADEMIC_LEVEL_LABELS_FR,
  type AcademicLevel,
} from "@smartinscription/shared";
import { Camera, QrCode, RotateCw, User, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoUploader } from "@/features/documents/components/photo-uploader";
import { cn } from "@/lib/utils";

export interface StudentCardData {
  numeroEtudiant: string;
  nom: string;
  prenom: string;
  birthDate: Date | string | null;
  birthPlace: string | null;
  nationality: string | null;
  telephone: string | null;
  email: string;
  ufrName: string;
  ufrCode: string;
  filiereName: string;
  niveau: string;
  anneeAcademique: string;
  photoUrl: string | null;
  qrDataUrl: string | null;
  isPaid: boolean;
}

interface StudentCardProps {
  student: StudentCardData;
  /** Active le bouton photo cliquable pour l'étudiant propriétaire (hors dossier verrouillé). */
  editable?: boolean;
  /** Verrouille le changement de photo (ex. dossier VALIDATED sans rejet photo). */
  photoLocked?: boolean;
}

function formatBirthDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

function formatLevelLabel(niveau: string): string {
  return ACADEMIC_LEVEL_LABELS_FR[niveau as AcademicLevel] ?? niveau;
}

/**
 * Carte étudiante numérique au format ID-1 (rapport 1,586) avec bascule recto/verso.
 */
export function StudentCard({
  student,
  editable = false,
  photoLocked = false,
}: StudentCardProps) {
  const [side, setSide] = useState<"recto" | "verso">("recto");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const canEditPhoto = editable && !photoLocked;
  const birthDateLabel = formatBirthDate(student.birthDate);
  const birthPlaceLabel = student.birthPlace?.trim() || "—";
  const birthLine =
    birthDateLabel === "—" && birthPlaceLabel === "—"
      ? "—"
      : `Né(e) le ${birthDateLabel} à ${birthPlaceLabel}`;

  function toggleSide() {
    setSide((prev) => (prev === "recto" ? "verso" : "recto"));
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {side === "recto" ? "Recto — Identité" : "Verso — Scolarité & QR"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleSide}
          aria-pressed={side === "verso"}
          className="h-8 rounded-lg px-3 text-xs"
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          {side === "recto" ? "Voir le verso" : "Voir le recto"}
        </Button>
      </div>

      {/* Format ID-1 (85.60 × 53.98 mm ≈ 1.586) */}
      <div
        role="region"
        aria-label="Carte d'étudiant numérique"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if ((e.target as HTMLElement).tagName === "BUTTON") return;
            e.preventDefault();
            toggleSide();
          }
        }}
        className={cn(
          "relative mx-auto w-full max-w-[460px] overflow-hidden rounded-xl border border-border bg-surface shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "sm:aspect-[1.586/1]"
        )}
      >
        {side === "recto" ? (
          <div className="flex h-full flex-col justify-between p-4 sm:p-5">
            {/* En-tête Recto */}
            <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-2.5">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/branding/logo_uasz.png"
                  alt="Logo UASZ"
                  className="h-9 w-9 shrink-0 rounded-md object-contain"
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                    CARTE D&apos;ÉTUDIANT
                  </p>
                  <p className="font-mono text-xs font-semibold text-foreground">
                    {student.numeroEtudiant}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                {student.anneeAcademique}
              </span>
            </div>

            {/* Corps Recto : infos à gauche, photo à droite */}
            <div className="my-2.5 grid grid-cols-12 items-center gap-3">
              <div className="col-span-8 space-y-1 text-xs">
                <div>
                  <p className="text-sm font-semibold uppercase leading-tight text-foreground">
                    {student.nom.toUpperCase()}
                  </p>
                  <p className="text-[13px] font-medium text-foreground">
                    {student.prenom}
                  </p>
                </div>
                <p className="text-[12px] text-muted-foreground">{birthLine}</p>
                <p className="text-[12px] text-muted-foreground">
                  Nationalité :{" "}
                  <span className="font-medium text-foreground">
                    {student.nationality?.trim() || "—"}
                  </span>
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Tél. :{" "}
                  <span className="font-medium text-foreground">
                    {student.telephone?.trim() || "—"}
                  </span>
                </p>
                <p className="truncate text-[12px] text-muted-foreground">
                  E-mail :{" "}
                  <span className="font-medium text-foreground">{student.email}</span>
                </p>
              </div>

              <div className="col-span-4 flex justify-end">
                {canEditPhoto ? (
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    aria-label={
                      student.photoUrl ? "Changer ma photo" : "Ajouter ma photo"
                    }
                    className="group relative flex h-28 w-[84px] flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 text-center transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    {student.photoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={student.photoUrl}
                          alt={`Photo de ${student.prenom} ${student.nom}`}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera className="h-3 w-3" />
                          Changer
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 px-1.5 text-muted-foreground">
                        <User className="h-7 w-7" />
                        <span className="text-[10px] font-medium leading-tight text-brand">
                          Ajoutez votre photo
                        </span>
                      </div>
                    )}
                  </button>
                ) : student.photoUrl ? (
                  <button
                    type="button"
                    onClick={() => setZoomOpen(true)}
                    aria-label="Agrandir la photo de l'étudiant"
                    className="group relative h-28 w-[84px] overflow-hidden rounded-lg border border-border bg-muted/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={student.photoUrl}
                      alt={`Photo de ${student.prenom} ${student.nom}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ZoomIn className="h-3 w-3" />
                      Zoom
                    </span>
                  </button>
                ) : (
                  <div className="flex h-28 w-[84px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 px-1.5 text-center text-muted-foreground">
                    <User className="h-7 w-7" />
                    <span className="text-[10px] leading-tight">
                      Ajoutez votre photo
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pied Recto */}
            <p className="border-t border-border/70 pt-1.5 text-[10px] text-muted-foreground">
              Aperçu numérique, ne remplace pas la carte officielle
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                  Parcours académique
                </p>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <p className="text-[11px] text-muted-foreground">UFR</p>
                    <p className="font-medium text-foreground">
                      {student.ufrCode} — {student.ufrName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Filière</p>
                    <p className="font-medium text-foreground">{student.filiereName}</p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Niveau</p>
                      <p className="font-medium text-foreground">
                        {formatLevelLabel(student.niveau)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Année</p>
                      <p className="font-medium text-foreground">
                        {student.anneeAcademique}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                {student.isPaid && student.qrDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={student.qrDataUrl}
                      alt={`QR code du dossier ${student.numeroEtudiant}`}
                      className="h-24 w-24 rounded bg-white p-1"
                    />
                    <span className="mt-1 text-[10px] font-medium text-foreground">
                      Vérification dossier
                    </span>
                  </>
                ) : (
                  <div className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 px-1 text-muted-foreground">
                    <QrCode className="h-6 w-6" />
                    <span className="text-[10px] font-medium leading-tight">
                      QR disponible après paiement
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="border-t border-border/70 pt-1.5 text-[10px] text-muted-foreground">
              Aperçu numérique, ne remplace pas la carte officielle
            </p>
          </div>
        )}
      </div>

      {/* Modale d'envoi photo depuis la carte (mode editable) */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {student.photoUrl ? "Changer ma photo" : "Ajouter ma photo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Visage dégagé, fond uni, cadrage portrait (JPG, PNG ou WEBP).
            </DialogDescription>
          </DialogHeader>
          <PhotoUploader
            mode="immediate"
            label={student.photoUrl ? "Choisir une nouvelle photo" : "Choisir ma photo"}
            onUploaded={() => setUploadModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modale d'agrandissement photo (lecture seule / agent) */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-sm rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {student.prenom} {student.nom}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {student.numeroEtudiant}
            </DialogDescription>
          </DialogHeader>
          {student.photoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={student.photoUrl}
              alt={`Photo agrandie de ${student.prenom} ${student.nom}`}
              className="mx-auto max-h-80 w-auto rounded-lg border border-border object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
