"use client";

import { useActionState } from "react";
import {
  DOCUMENT_TYPE_LABELS_FR,
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
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  uploadDocumentAction,
  type DocumentActionState,
} from "@/features/documents/actions";
import { cn } from "@/lib/utils";

interface DocumentUploadRowProps {
  type: DocumentType;
  existingDoc?: {
    id: string;
    verificationStatus: DocumentStatus;
    motif: string | null;
  } | null;
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

const initialState: DocumentActionState = {};

/** Ligne compacte de dépôt et suivi pour une pièce justificative. */
export function DocumentUploadCard({ type, existingDoc }: DocumentUploadRowProps) {
  const [state, formAction, isPending] = useActionState(uploadDocumentAction, initialState);
  const label = DOCUMENT_TYPE_LABELS_FR[type];
  const badgeInfo = existingDoc ? STATUS_BADGE[existingDoc.verificationStatus] : null;
  const StatusIcon = badgeInfo?.icon;

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
                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px] text-muted-foreground">
                  Non déposé
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG ou WEBP · max 5 Mo
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

        {existingDoc?.verificationStatus !== "APPROVED" && (
          <form
            action={formAction}
            className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap"
          >
            <input type="hidden" name="type" value={type} />
            <input
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
              aria-label={`Choisir un fichier pour ${label}`}
              className="w-full max-w-[210px] text-xs text-muted-foreground file:mr-2 file:h-9 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
            />
            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="h-9 shrink-0 rounded-lg bg-brand px-3 text-[13px] font-medium text-brand-foreground hover:bg-brand-dark"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {existingDoc ? "Remplacer" : "Envoyer"}
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      {existingDoc?.motif && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
          <strong>Motif du rejet :</strong> {existingDoc.motif}
        </p>
      )}

      {state.error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </p>
      )}

      {state.success && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{state.success}</span>
        </p>
      )}
    </div>
  );
}
