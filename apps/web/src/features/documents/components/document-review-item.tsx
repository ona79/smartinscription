"use client";

import { useState } from "react";
import {
  DOCUMENT_TYPE_LABELS_FR,
  type DocumentStatus,
  type DocumentType,
} from "@smartinscription/shared";
import { Check, ExternalLink, Eye, FileText, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";
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
import { reviewDocumentAction } from "@/features/documents/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

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

/**
 * Ligne de vérification d'un document par un agent :
 * - aperçu plein écran sur mobile avec zoom pour les images ;
 * - boutons Approuver / Rejeter (saisie du motif dans une feuille sur mobile).
 */
export function DocumentReviewItem({
  documentId,
  registrationId,
  type,
  status,
  motif,
}: DocumentReviewItemProps) {
  const { formAction, isPending } = useFormActionToast(reviewDocumentAction, {
    onSuccess: () => setRejectOpen(false),
  });
  const [rejectMotif, setRejectMotif] = useState(motif ?? "");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);

  async function handleOpenPreview() {
    setPreviewOpen(true);
    setPreviewZoomed(false);
    if (previewData) return;

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}?format=json`);
      const json = (await res.json()) as PreviewPayload & { error?: string };
      if (!res.ok) {
        setPreviewError(json.error ?? MESSAGES.documents.notFound);
      } else {
        setPreviewData(json);
      }
    } catch {
      setPreviewError(MESSAGES.documents.network);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {DOCUMENT_TYPE_LABELS_FR[type]}
          </p>
          <button
            type="button"
            onClick={handleOpenPreview}
            className="mt-1 inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-brand hover:underline"
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

      {status === "REJECTED" && motif && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Motif : {motif}
        </p>
      )}

      {/* Mobile : boutons pleine largeur ; desktop : Approuver + champ motif + Rejeter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form action={formAction} className="w-full sm:w-auto">
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="decision" value="APPROVED" />
          <Button
            type="submit"
            disabled={isPending || status === "APPROVED"}
            size="sm"
            className="w-full rounded-lg bg-brand px-3.5 text-xs font-semibold text-brand-foreground hover:bg-brand-dark sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Approuver
          </Button>
        </form>

        {/* Mobile : bouton Rejeter qui ouvre la feuille de saisie du motif */}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => setRejectOpen(true)}
          className="w-full rounded-lg px-3.5 text-xs font-semibold sm:hidden"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Rejeter
        </Button>

        {/* Desktop : saisie inline */}
        <form action={formAction} className="hidden flex-1 items-center gap-2 sm:flex">
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

      {/* Feuille mobile pour saisir le motif de rejet */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Rejeter : {DOCUMENT_TYPE_LABELS_FR[type]}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Indiquez la raison du rejet pour que l&apos;étudiant puisse corriger sa pièce.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="registrationId" value={registrationId} />
            <input type="hidden" name="decision" value="REJECTED" />
            <Input
              name="motif"
              value={rejectMotif}
              onChange={(e) => setRejectMotif(e.target.value)}
              placeholder="Ex : Document flou ou illisible"
              required
              minLength={3}
              autoFocus
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending}
                variant="destructive"
                className="w-full rounded-lg sm:w-auto"
              >
                {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Aperçu plein écran sur mobile avec zoom */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] rounded-none p-4 sm:h-auto sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-xl sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {DOCUMENT_TYPE_LABELS_FR[type]}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {previewData?.fileName ?? "Aperçu sécurisé du justificatif étudiant"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 min-h-0 flex-1 overflow-auto">
            {previewLoading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/20">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {previewError}
              </div>
            ) : previewData?.isDemo ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center sm:p-8">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Document de démonstration synthétique
                </p>
                <p className="text-xs text-muted-foreground">
                  Ce dossier provient du jeu de données de démonstration ({previewData.fileName}).
                </p>
              </div>
            ) : previewData?.url ? (
              previewData.kind === "image" ? (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewZoomed((z) => !z)}
                      className="rounded-lg text-xs"
                    >
                      {previewZoomed ? (
                        <>
                          <ZoomOut className="mr-1.5 h-3.5 w-3.5" />
                          Ajuster
                        </>
                      ) : (
                        <>
                          <ZoomIn className="mr-1.5 h-3.5 w-3.5" />
                          Zoomer
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="overflow-auto rounded-lg border border-border bg-muted/10 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewData.url}
                      alt={DOCUMENT_TYPE_LABELS_FR[type]}
                      className={cn(
                        "mx-auto rounded-lg object-contain transition-transform",
                        previewZoomed
                          ? "max-h-none w-[160%] max-w-none sm:w-[140%]"
                          : "max-h-[65dvh] w-auto"
                      )}
                    />
                  </div>
                </div>
              ) : (
                <iframe
                  src={previewData.url}
                  title={DOCUMENT_TYPE_LABELS_FR[type]}
                  className="h-[65dvh] w-full rounded-lg border border-border bg-white"
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
                className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-brand hover:underline sm:min-h-9"
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
              className="rounded-lg"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
