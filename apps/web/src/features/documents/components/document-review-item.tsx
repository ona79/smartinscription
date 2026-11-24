"use client";

import { useActionState, useState } from "react";
import {
  DOCUMENT_TYPE_LABELS_FR,
  type DocumentStatus,
  type DocumentType,
} from "@smartinscription/shared";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  reviewDocumentAction,
  type DocumentActionState,
} from "@/features/documents/actions";

interface DocumentReviewItemProps {
  documentId: string;
  registrationId: string;
  type: DocumentType;
  status: DocumentStatus;
  motif: string | null;
}

const initialState: DocumentActionState = {};

/** Ligne de vérification d'un document par un agent (Approuver ou Rejeter avec motif). */
export function DocumentReviewItem({
  documentId,
  registrationId,
  type,
  status,
  motif,
}: DocumentReviewItemProps) {
  const [state, formAction, isPending] = useActionState(reviewDocumentAction, initialState);
  const [rejectMotif, setRejectMotif] = useState(motif ?? "");

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {DOCUMENT_TYPE_LABELS_FR[type]}
          </p>
          <a
            href={`/api/documents/${documentId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ouvrir la pièce
          </a>
        </div>

        <Badge
          variant="secondary"
          className={
            status === "APPROVED"
              ? "rounded-full bg-success text-white"
              : status === "REJECTED"
                ? "rounded-full bg-destructive text-white"
                : "rounded-full bg-amber-100 text-amber-800"
          }
        >
          {status === "APPROVED"
            ? "Approuvé"
            : status === "REJECTED"
              ? "Rejeté"
              : "En attente"}
        </Badge>
      </div>

      {state.error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form action={formAction}>
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="decision" value="APPROVED" />
          <Button
            type="submit"
            disabled={isPending || status === "APPROVED"}
            size="sm"
            className="h-9 rounded-xl bg-brand px-3.5 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Approuver
          </Button>
        </form>

        <form action={formAction} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="decision" value="REJECTED" />
          <Input
            name="motif"
            value={rejectMotif}
            onChange={(e) => setRejectMotif(e.target.value)}
            placeholder="Motif de rejet..."
            className="h-9 rounded-xl text-xs"
          />
          <Button
            type="submit"
            disabled={isPending}
            variant="destructive"
            size="sm"
            className="h-9 shrink-0 rounded-xl px-3.5 text-xs font-semibold"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Rejeter
          </Button>
        </form>
      </div>
    </div>
  );
}
