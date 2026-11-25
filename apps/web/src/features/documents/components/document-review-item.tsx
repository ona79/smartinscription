"use client";

import { useActionState, useState } from "react";
import {
  DOCUMENT_TYPE_LABELS_FR,
  type DocumentStatus,
  type DocumentType,
} from "@smartinscription/shared";
import { Check, ExternalLink, Eye, FileText, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface PreviewPayload {
  isDemo: boolean;
  url: string | null;
  fileName: string;
  kind: "image" | "pdf";
}

const initialState: DocumentActionState = {};

/** Ligne de vérification d'un document par un agent (aperçu en fenêtre modale + Approuver / Rejeter). */
export function DocumentReviewItem({
  documentId,
  registrationId,
  type,
  status,
  motif,
}: DocumentReviewItemProps) {
  const [state, formAction, isPending] = useActionState(reviewDocumentAction, initialState);
  const [rejectMotif, setRejectMotif] = useState(motif ?? "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);

  async function handleOpenPreview() {
    setPreviewOpen(true);
    if (previewData) return;

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}?format=json`);
      const json = (await res.json()) as PreviewPayload & { error?: string };
      if (!res.ok) {
        setPreviewError(json.error ?? "Impossible de charger la pièce.");
      } else {
        setPreviewData(json);
      }
    } catch {
      setPreviewError("Erreur réseau lors du chargement de la pièce.");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {DOCUMENT_TYPE_LABELS_FR[type]}
          </p>
          <button
            type="button"
            onClick={handleOpenPreview}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
          >
            <Eye className="h-3.5 w-3.5" />
            Voir la pièce
          </button>
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
            className="h-9 rounded-lg bg-brand px-3.5 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
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
            className="h-9 rounded-lg text-xs"
          />
          <Button
            type="submit"
            disabled={isPending}
            variant="destructive"
            size="sm"
            className="h-9 shrink-0 rounded-lg px-3.5 text-xs font-semibold"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Rejeter
          </Button>
        </form>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-xl p-5 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {DOCUMENT_TYPE_LABELS_FR[type]}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {previewData?.fileName ?? "Aperçu sécurisé du justificatif étudiant"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {previewLoading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/20">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {previewError}
              </div>
            ) : previewData?.isDemo ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Document de démonstration synthétique
                </p>
                <p className="text-xs text-muted-foreground">
                  Ce dossier provient du jeu de données de démonstration ({previewData.fileName}) et ne contient pas de fichier physique dans Supabase Storage.
                </p>
              </div>
            ) : previewData?.url ? (
              previewData.kind === "image" ? (
                <div className="flex justify-center rounded-lg border border-border bg-muted/10 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewData.url}
                    alt={DOCUMENT_TYPE_LABELS_FR[type]}
                    className="max-h-[70vh] w-auto rounded-lg object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={previewData.url}
                  title={DOCUMENT_TYPE_LABELS_FR[type]}
                  className="h-[70vh] w-full rounded-lg border border-border bg-white"
                />
              )
            ) : null}
          </div>

          <DialogFooter className="mt-2 flex-row items-center justify-between gap-2 sm:justify-between">
            {previewData?.url ? (
              <a
                href={previewData.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ouvrir dans un nouvel onglet
              </a>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(false)}
              className="h-9 rounded-lg"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
