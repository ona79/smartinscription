"use client";

import { useState } from "react";
import { Camera, Maximize2, QrCode, RotateCw, User, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoUploader } from "@/features/documents/components/photo-uploader";
import {
  buildAcademicTableColumns,
  formatCursusLine,
  type AcademicTableColumn,
} from "@/features/dossier/lib/academic-table";
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
  cardQrSvgUrl?: string | null;
  academicColumns?: AcademicTableColumn[];
  qrDataUrl?: string | null;
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

/**
 * Carte étudiante numérique compacte au format ID-1 (rapport 1,586, largeur max 400 px) :
 * - Recto : identité, naissance (« Né(e) le — à — » si absent), photo ;
 * - Verso : UFR en majuscules, cursus, QR d'identité permanent agrandissable, tableau SCOLARITÉ / BU.
 */
export function StudentCard({
  student,
  editable = false,
  photoLocked = false,
}: StudentCardProps) {
  const [side, setSide] = useState<"recto" | "verso">("recto");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [qrZoomOpen, setQrZoomOpen] = useState(false);
  const [cardFullscreenOpen, setCardFullscreenOpen] = useState(false);

  const canEditPhoto = editable && !photoLocked;
  const birthDateLabel = formatBirthDate(student.birthDate);
  const birthPlaceLabel = student.birthPlace?.trim() || "—";
  const birthLine = `Né(e) le ${birthDateLabel} à ${birthPlaceLabel}`;

  const columns =
    student.academicColumns && student.academicColumns.length > 0
      ? student.academicColumns
      : buildAcademicTableColumns({
          currentAcademicYear: student.anneeAcademique,
          currentNiveau: student.niveau,
          registrations: [],
        });

  const qrImageSrc = student.cardQrSvgUrl ?? student.qrDataUrl ?? null;

  function toggleSide() {
    setSide((prev) => (prev === "recto" ? "verso" : "recto"));
  }

  function renderCardBody(expanded = false) {
    return (
      <div
        className={cn(
          "@container relative aspect-[1.586/1] w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xs",
          !expanded && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        )}
      >
        {side === "recto" ? (
          <div className="flex h-full flex-col justify-between p-[clamp(0.65rem,3.3cqi,1rem)]">
            {/* En-tête Recto */}
            <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-[clamp(0.3rem,1.6cqi,0.5rem)]">
              <div className="flex min-w-0 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/branding/logo_uasz.png"
                  alt="Logo UASZ"
                  className="h-[clamp(1.6rem,7.5cqi,2.1rem)] w-[clamp(1.6rem,7.5cqi,2.1rem)] shrink-0 rounded-md object-contain"
                />
                <div className="min-w-0">
                  <p className="text-[clamp(0.625rem,2.4cqi,0.6875rem)] font-semibold uppercase tracking-wider text-brand">
                    CARTE D&apos;ÉTUDIANT
                  </p>
                  <p className="font-mono text-[clamp(0.65rem,2.8cqi,0.75rem)] font-semibold text-foreground">
                    {student.numeroEtudiant}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[clamp(0.625rem,2.4cqi,0.6875rem)] font-medium text-accent-foreground">
                {student.anneeAcademique}
              </span>
            </div>

            {/* Corps Recto : infos à gauche, photo à droite */}
            <div className="my-auto grid grid-cols-12 items-center gap-2 py-0.5">
              <div className="col-span-8 min-w-0 space-y-[clamp(0.12rem,0.7cqi,0.25rem)]">
                <div>
                  <p className="break-words text-[clamp(0.78rem,3.4cqi,0.9rem)] font-semibold uppercase leading-tight text-foreground">
                    {student.nom.toUpperCase()}
                  </p>
                  <p className="break-words text-[clamp(0.72rem,3.1cqi,0.82rem)] font-medium leading-tight text-foreground">
                    {student.prenom}
                  </p>
                </div>
                <p className="break-words text-[clamp(0.625rem,2.6cqi,0.72rem)] leading-snug text-muted-foreground">
                  {birthLine}
                </p>
                <p className="break-words text-[clamp(0.625rem,2.6cqi,0.72rem)] leading-snug text-muted-foreground">
                  Nationalité :{" "}
                  <span className="font-medium text-foreground">
                    {student.nationality?.trim() || "—"}
                  </span>
                </p>
                <p className="break-words text-[clamp(0.625rem,2.6cqi,0.72rem)] leading-snug text-muted-foreground">
                  Tél. :{" "}
                  <span className="font-medium text-foreground">
                    {student.telephone?.trim() || "—"}
                  </span>
                </p>
                <p className="break-all text-[clamp(0.625rem,2.4cqi,0.6875rem)] leading-snug text-muted-foreground">
                  {student.email}
                </p>
              </div>

              <div className="col-span-4 flex justify-end">
                {canEditPhoto ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadModalOpen(true);
                    }}
                    aria-label={
                      student.photoUrl ? "Changer ma photo" : "Ajouter ma photo"
                    }
                    className="group relative flex aspect-[3/4] w-[clamp(3.6rem,18cqi,4.8rem)] min-w-[44px] flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 text-center transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    {student.photoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={student.photoUrl}
                          alt={`Photo de ${student.prenom} ${student.nom}`}
                          className="h-full w-full object-cover object-top"
                        />
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-0.5 text-[10px] font-medium text-white opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <Camera className="h-2.5 w-2.5" />
                          Changer
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 px-1 text-muted-foreground">
                        <User className="h-5 w-5" />
                        <span className="text-[10px] font-medium leading-tight text-brand">
                          Ajoutez votre photo
                        </span>
                      </div>
                    )}
                  </button>
                ) : student.photoUrl ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomOpen(true);
                    }}
                    aria-label="Agrandir la photo de l'étudiant"
                    className="group relative aspect-[3/4] w-[clamp(3.6rem,18cqi,4.8rem)] min-w-[44px] overflow-hidden rounded-lg border border-border bg-muted/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={student.photoUrl}
                      alt={`Photo de ${student.prenom} ${student.nom}`}
                      className="h-full w-full object-cover object-top"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-0.5 text-[10px] text-white opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <ZoomIn className="h-2.5 w-2.5" />
                      Zoom
                    </span>
                  </button>
                ) : (
                  <div className="flex aspect-[3/4] w-[clamp(3.6rem,18cqi,4.8rem)] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 px-1 text-center text-muted-foreground">
                    <User className="h-5 w-5" />
                    <span className="text-[10px] leading-tight">
                      Ajoutez votre photo
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pied Recto */}
            <p className="border-t border-border/70 pt-1 text-[clamp(0.625rem,2.2cqi,0.625rem)] text-muted-foreground">
              Aperçu numérique, ne remplace pas la carte officielle
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between p-[clamp(0.6rem,3cqi,0.9rem)]">
            {/* En-tête Verso + QR d'identité */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="break-words text-[clamp(0.625rem,2.4cqi,0.6875rem)] font-semibold uppercase leading-tight tracking-wide text-brand">
                  {student.ufrName.toUpperCase()}
                </p>
                <p className="break-words text-[clamp(0.68rem,2.8cqi,0.78rem)] font-medium leading-tight text-foreground">
                  {formatCursusLine(student.niveau, student.filiereName)}
                </p>
              </div>

              {qrImageSrc ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrZoomOpen(true);
                  }}
                  aria-label="Agrandir le code d'identité QR"
                  className="flex shrink-0 flex-col items-center rounded-lg border border-border bg-white p-1 text-center transition-colors hover:border-brand"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageSrc}
                    alt={`Code d'identité ${student.numeroEtudiant}`}
                    className="h-[clamp(2.8rem,14cqi,3.8rem)] w-[clamp(2.8rem,14cqi,3.8rem)]"
                  />
                  <span className="mt-0.5 text-[10px] font-medium leading-none text-foreground">
                    Code d&apos;identité
                  </span>
                </button>
              ) : (
                <div className="flex shrink-0 flex-col items-center rounded-lg border border-border bg-muted/20 p-1.5 text-center text-muted-foreground">
                  <QrCode className="h-7 w-7" />
                  <span className="mt-0.5 text-[10px] font-medium leading-none">
                    Code d&apos;identité
                  </span>
                </div>
              )}
            </div>

            {/* Tableau de scolarité fidèle à la carte UASZ */}
            <div className="my-1 overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-center text-[clamp(0.625rem,2.3cqi,0.6875rem)]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="w-[24%] px-1.5 py-1 text-left font-semibold text-muted-foreground">
                      Année
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.anneeAcademique}
                        className={cn(
                          "border-l border-border px-1 py-1 font-semibold",
                          col.isCurrent
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground"
                        )}
                      >
                        {col.anneeAcademique}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="bg-muted/20 px-1.5 py-1 text-left font-semibold text-muted-foreground">
                      SCOLARITÉ
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.anneeAcademique}
                        className={cn(
                          "border-l border-border px-1 py-1 font-medium text-foreground",
                          col.isCurrent && "bg-accent/50"
                        )}
                      >
                        {col.scolariteLabel}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="bg-muted/20 px-1.5 py-1 text-left font-semibold text-muted-foreground">
                      BU
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.anneeAcademique}
                        className={cn(
                          "border-l border-border px-1 py-1",
                          col.isCurrent && "bg-accent/50"
                        )}
                      >
                        {col.buActive ? (
                          <span className="font-semibold text-success">Active</span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="border-t border-border/70 pt-1 text-[clamp(0.625rem,2.2cqi,0.625rem)] text-muted-foreground">
              Aperçu numérique, ne remplace pas la carte officielle
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[400px] space-y-2.5">
      {/* Format ID-1 (85.60 × 53.98 mm ≈ 1.586) — toucher sur mobile ouvre la vue agrandie */}
      <div
        role="region"
        aria-label="Carte d'étudiant numérique"
        tabIndex={0}
        onClick={() => {
          if (typeof window !== "undefined" && window.innerWidth < 640) {
            setCardFullscreenOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if ((e.target as HTMLElement).tagName === "BUTTON") return;
            e.preventDefault();
            toggleSide();
          }
        }}
        className="cursor-pointer sm:cursor-default"
      >
        {renderCardBody(false)}
      </div>

      {/* Bouton de retournement directement sous la carte */}
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleSide}
          aria-pressed={side === "verso"}
          className="flex-1 rounded-lg text-xs sm:flex-none"
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          {side === "recto" ? "Voir le verso" : "Voir le recto"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCardFullscreenOpen(true)}
          aria-label="Agrandir la carte"
          className="rounded-lg text-xs text-muted-foreground sm:hidden"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Vue agrandie plein écran de la carte (mobile / tactile) */}
      <Dialog open={cardFullscreenOpen} onOpenChange={setCardFullscreenOpen}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] justify-center rounded-none p-4 sm:h-auto sm:max-w-lg sm:rounded-xl sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Carte étudiante numérique
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {student.prenom} {student.nom.toUpperCase()} · {student.numeroEtudiant}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {renderCardBody(true)}
            <Button
              type="button"
              variant="outline"
              onClick={toggleSide}
              className="w-full rounded-lg text-xs"
            >
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              {side === "recto" ? "Voir le verso" : "Voir le recto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modale d'agrandissement du QR code d'identité sur fond blanc */}
      <Dialog open={qrZoomOpen} onOpenChange={setQrZoomOpen}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] justify-center bg-white p-5 text-slate-900 sm:h-auto sm:max-w-sm sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-semibold text-slate-900">
              Code d&apos;identité
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-600">
              Présentez ce QR code à un agent de scolarité.
            </DialogDescription>
          </DialogHeader>
          {qrImageSrc && (
            <div className="mx-auto rounded-xl border border-slate-200 bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageSrc}
                alt={`Code d'identité agrandi ${student.numeroEtudiant}`}
                className="h-64 w-64"
              />
            </div>
          )}
          <p className="text-center font-mono text-xs font-semibold text-slate-700">
            {student.numeroEtudiant}
          </p>
        </DialogContent>
      </Dialog>

      {/* Modale d'envoi photo depuis la carte (mode editable) */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="rounded-xl p-5 sm:max-w-md">
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
            fullWidthMobile
            label={student.photoUrl ? "Choisir une nouvelle photo" : "Choisir ma photo"}
            onUploaded={() => setUploadModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modale d'agrandissement photo (lecture seule / agent) */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="rounded-xl p-5 sm:max-w-sm">
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
