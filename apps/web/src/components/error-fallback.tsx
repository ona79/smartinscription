"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface ErrorFallbackProps {
  title?: string;
  description?: string;
  reference?: string;
  backHref?: string;
  backLabel?: string;
  onRetry?: () => void;
}

/**
 * Écran d'erreur compact, responsive mobile/desktop, avec identifiant de référence
 * côté serveur, bouton « Réessayer » et lien de retour.
 */
export function ErrorFallback({
  title = MESSAGES.errorPage.title,
  description = MESSAGES.errorPage.description,
  reference,
  backHref = "/",
  backLabel = MESSAGES.errorPage.back,
  onRetry,
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[60dvh] w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 text-center shadow-xs sm:p-6">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <h1 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>

        {reference && (
          <p className="mt-3 inline-block rounded-lg border border-border bg-muted/50 px-3 py-1 font-mono text-xs text-muted-foreground">
            {MESSAGES.errorPage.reference(reference)}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
            >
              <RotateCw className="mr-1.5 h-4 w-4" />
              {MESSAGES.errorPage.retry}
            </Button>
          )}
          <Link
            href={backHref}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full rounded-lg sm:w-auto"
            )}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
