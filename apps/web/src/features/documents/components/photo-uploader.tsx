"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_TYPES } from "@smartinscription/shared";
import { Camera, Check, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocumentViaActiveStorage } from "@/features/documents/lib/client-upload";
import { compressPhotoFile } from "@/features/documents/lib/compress-image";
import { notifyActionResult } from "@/hooks/use-action-toast";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  /** "deferred" : sélection locale pour un formulaire parent ; "immediate" : envoi direct. */
  mode?: "deferred" | "immediate";
  disabled?: boolean;
  label?: string;
  fullWidthMobile?: boolean;
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
  fullWidthMobile = false,
  onFileSelected,
  onUploaded,
}: PhotoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.files?.[0];
    if (!raw) return;

    setError(null);
    setSuccess(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(raw.type)) {
      const msg = MESSAGES.photo.invalidFormat;
      setError(msg);
      notifyActionResult({ ok: false, error: msg });
      return;
    }

    try {
      const compressed = await compressPhotoFile(raw);
      if (compressed.size > 5 * 1024 * 1024) {
        const msg = MESSAGES.photo.tooLarge;
        setError(msg);
        notifyActionResult({ ok: false, error: msg });
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const nextPreview = URL.createObjectURL(compressed);
      setPendingFile(compressed);
      setPreviewUrl(nextPreview);

      if (mode === "deferred") {
        onFileSelected?.(compressed, nextPreview);
      }
    } catch {
      const msg = MESSAGES.photo.unreadable;
      setError(msg);
      notifyActionResult({ ok: false, error: msg });
    }
  }

  async function handleConfirmUpload() {
    if (!pendingFile || isUploading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsUploading(true);
    setProgress(5);
    setError(null);
    setSuccess(null);

    const res = await uploadDocumentViaActiveStorage(DOCUMENT_TYPES.PHOTO, pendingFile, {
      signal: controller.signal,
      onProgress: setProgress,
    });

    abortRef.current = null;
    setIsUploading(false);
    setProgress(0);

    notifyActionResult(res);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    setPendingFile(null);
    setSuccess(res.message ?? MESSAGES.photo.success);
    onUploaded?.();
    router.refresh();
  }

  function handleClear() {
    if (isUploading) {
      abortRef.current?.abort();
      return;
    }
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "rounded-lg text-[13px]",
            fullWidthMobile && "w-full sm:w-auto"
          )}
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
            className="w-full rounded-lg bg-brand text-[13px] text-brand-foreground hover:bg-brand-dark sm:w-auto"
          >
            {isUploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isUploading ? `Envoi (${progress} %)...` : "Confirmer l'envoi"}
          </Button>
        )}

        {(pendingFile || isUploading) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="w-full rounded-lg text-xs text-muted-foreground sm:w-auto"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {isUploading ? "Annuler l'envoi" : "Annuler"}
          </Button>
        )}
      </div>

      {isUploading && (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-brand transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {previewUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Aperçu de la photo sélectionnée"
            className="h-16 w-12 shrink-0 rounded-md border border-border object-cover"
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

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p className="text-xs font-medium text-destructive">{error}</p>
        )}
        {success && !error && (
          <p className="flex items-center gap-1 text-xs font-medium text-success">
            <Check className="h-3.5 w-3.5" />
            {success}
          </p>
        )}
      </div>
    </div>
  );
}
