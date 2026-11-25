"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_TYPES } from "@smartinscription/shared";
import { Camera, Check, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocumentViaActiveStorage } from "@/features/documents/lib/client-upload";
import { compressPhotoFile } from "@/features/documents/lib/compress-image";

interface PhotoUploaderProps {
  /** "deferred" : sélection locale pour un formulaire parent ; "immediate" : envoi direct. */
  mode?: "deferred" | "immediate";
  disabled?: boolean;
  label?: string;
  onFileSelected?: (file: File | null, previewUrl: string | null) => void;
  onUploaded?: () => void;
}

/**
 * Composant unique de sélection, aperçu, compression et envoi de la photo d'identité.
 */
export function PhotoUploader({
  mode = "immediate",
  disabled = false,
  label = "Choisir une photo",
  onFileSelected,
  onUploaded,
}: PhotoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.files?.[0];
    if (!raw) return;

    setError(null);
    setSuccess(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(raw.type)) {
      setError("Format invalide. Utilisez JPG, PNG ou WEBP.");
      return;
    }

    try {
      const compressed = await compressPhotoFile(raw);
      if (compressed.size > 5 * 1024 * 1024) {
        setError("La photo dépasse 5 Mo même après compression.");
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const nextPreview = URL.createObjectURL(compressed);
      setPendingFile(compressed);
      setPreviewUrl(nextPreview);

      if (mode === "deferred") {
        onFileSelected?.(compressed, nextPreview);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de traiter la photo."
      );
    }
  }

  async function handleConfirmUpload() {
    if (!pendingFile) return;
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const res = await uploadDocumentViaActiveStorage(DOCUMENT_TYPES.PHOTO, pendingFile);
    setIsUploading(false);

    if (!res.ok) {
      setError(res.error ?? "Échec du téléversement.");
      return;
    }

    setPendingFile(null);
    setSuccess("Photo enregistrée.");
    onUploaded?.();
    router.refresh();
  }

  function handleClear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    if (mode === "deferred") {
      onFileSelected?.(null, null);
    }
  }

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
        className="sr-only"
        aria-label={label}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="h-9 rounded-lg text-[13px]"
        >
          <Camera className="mr-1.5 h-4 w-4" />
          {label}
        </Button>

        {mode === "immediate" && pendingFile && (
          <Button
            type="button"
            size="sm"
            disabled={isUploading}
            onClick={handleConfirmUpload}
            className="h-9 rounded-lg bg-brand text-[13px] text-brand-foreground hover:bg-brand-dark"
          >
            {isUploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            Confirmer l&apos;envoi
          </Button>
        )}

        {pendingFile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={handleClear}
            className="h-9 rounded-lg text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Annuler
          </Button>
        )}
      </div>

      {previewUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Aperçu de la photo sélectionnée"
            className="h-16 w-12 rounded-md border border-border object-cover"
          />
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">
              {pendingFile?.name ?? "Photo prête"}
            </p>
            {pendingFile && (
              <p>{Math.round(pendingFile.size / 1024)} Ko (compressée)</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-1 text-xs font-medium text-success">
          <Check className="h-3.5 w-3.5" />
          {success}
        </p>
      )}
    </div>
  );
}
