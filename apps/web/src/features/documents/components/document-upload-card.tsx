"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DOCUMENT_TYPE_LABELS_FR,
  DOCUMENT_TYPES,
  type DocumentStatus,
  type DocumentType,
} from "@smartinscription/shared";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteDocumentAction } from "@/features/documents/actions";
import { PhotoUploader } from "@/features/documents/components/photo-uploader";
import { uploadDocumentViaActiveStorage } from "@/features/documents/lib/client-upload";
import { cn } from "@/lib/utils";

interface DocumentUploadRowProps {
  type: DocumentType;
  existingDoc?: {
    id: string;
    verificationStatus: DocumentStatus;
    motif: string | null;
  } | null;
  isRegistrationValidated?: boolean;
}

const STATUS_BADGE: Record<
  DocumentStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "En attente",
    className: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  APPROVED: {
    label: "Approuvé",
    className: "bg-success text-white",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejeté",
    className: "bg-destructive text-white",
    icon: XCircle,
  },
};

/** Ligne compacte de dépôt, remplacement, suppression et suivi pour une pièce justificative. */
export function DocumentUploadCard({
  type,
  existingDoc,
  isRegistrationValidated = false,
}: DocumentUploadRowProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const label = DOCUMENT_TYPE_LABELS_FR[type];
  const badgeInfo = existingDoc ? STATUS_BADGE[existingDoc.verificationStatus] : null;
  const StatusIcon = badgeInfo?.icon;
  const isPhoto = type === DOCUMENT_TYPES.PHOTO;

  const isLocked =
    existingDoc?.verificationStatus === "APPROVED" ||
    (isRegistrationValidated &&
      !(isPhoto && existingDoc?.verificationStatus === "REJECTED"));

  const canDelete =
    Boolean(existingDoc) &&
    !isRegistrationValidated &&
    existingDoc?.verificationStatus !== "APPROVED";

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return;

    setIsPending(true);
    setError(null);
    setSuccess(null);

    const res = await uploadDocumentViaActiveStorage(type, selectedFile);
    setIsPending(false);

    if (!res.ok) {
      setError(res.error ?? "Erreur lors du téléversement.");
      return;
    }

    setSelectedFile(null);
    setSuccess("Document enregistré avec succès.");
    router.refresh();
  }

  async function handleDelete() {
    if (!existingDoc) return;
    setIsPending(true);
    setError(null);
    setSuccess(null);

    const res = await deleteDocumentAction(existingDoc.id);
    setIsPending(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setSuccess(res.success ?? "Pièce supprimée.");
    router.refresh();
  }

  return (
    <div className="space-y-2.5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileText className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{label}</p>
              {badgeInfo && StatusIcon ? (
                <Badge className={cn("rounded-full px-2 py-0.5 text-[11px]", badgeInfo.className)}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {badgeInfo.label}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  Non déposé
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPhoto
                ? "JPG, PNG ou WEBP · max 5 Mo (compressée auto)"
                : "JPG, PNG, WEBP (max 5 Mo) ou PDF (max 4 Mo)"}
              {existingDoc && (
                <>
                  {" · "}
                  <a
                    href={`/api/documents/${existingDoc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Voir le fichier
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {!isLocked &&
            (isPhoto ? (
              <PhotoUploader
                mode="immediate"
                label={existingDoc ? "Changer la photo" : "Ajouter la photo"}
              />
            ) : (
              <form
                onSubmit={handleUploadSubmit}
                className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  required
                  disabled={isPending}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  aria-label={`Choisir un fichier pour ${label}`}
                  className="w-full max-w-[210px] text-xs text-muted-foreground file:mr-2 file:h-9 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !selectedFile}
                  className="h-9 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-brand-foreground hover:bg-brand-dark"
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {existingDoc ? "Remplacer" : "Envoyer"}
                </Button>
              </form>
            ))}

          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleDelete}
              aria-label={`Supprimer ${label}`}
              className="h-9 rounded-lg px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {existingDoc?.verificationStatus === "REJECTED" && existingDoc.motif && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Motif du rejet : {existingDoc.motif}</span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs font-medium text-success">{success}</p>
      )}
    </div>
  );
}
