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
import { Card, CardContent } from "@/components/ui/card";
import {
  uploadDocumentAction,
  type DocumentActionState,
} from "@/features/documents/actions";
import { cn } from "@/lib/utils";

interface DocumentUploadCardProps {
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
    label: "En attente de vérification",
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

/** Carte de dépôt et suivi pour un type de pièce justificative. */
export function DocumentUploadCard({ type, existingDoc }: DocumentUploadCardProps) {
  const [state, formAction, isPending] = useActionState(uploadDocumentAction, initialState);
  const label = DOCUMENT_TYPE_LABELS_FR[type];
  const badgeInfo = existingDoc ? STATUS_BADGE[existingDoc.verificationStatus] : null;
  const StatusIcon = badgeInfo?.icon;

  return (
    <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG ou WEBP (max 5 Mo)</p>
            </div>
          </div>

          {badgeInfo && StatusIcon && (
            <Badge className={cn("rounded-full px-2.5 py-0.5 text-xs", badgeInfo.className)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {badgeInfo.label}
            </Badge>
          )}
        </div>

        {existingDoc?.motif && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
            <strong>Motif du rejet :</strong> {existingDoc.motif}
          </div>
        )}

        {state.error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state.success && (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3.5 py-2 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{state.success}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {existingDoc && (
            <a
              href={`/api/documents/${existingDoc.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Consulter le fichier déposé
            </a>
          )}

          {existingDoc?.verificationStatus !== "APPROVED" && (
            <form action={formAction} className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <input type="hidden" name="type" value={type} />
              <input
                type="file"
                name="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                required
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/80"
              />
              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="h-9 shrink-0 rounded-xl bg-brand px-4 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {existingDoc ? "Remplacer" : "Téléverser"}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
