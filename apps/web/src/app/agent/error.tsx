"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error-fallback";

interface SegmentErrorProps {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}

export default function AgentError({ error, retry, reset }: SegmentErrorProps) {
  useEffect(() => {
    console.error("[error][agent]", error);
  }, [error]);

  return (
    <ErrorFallback
      reference={error.digest}
      backHref="/agent"
      backLabel="Retour à l'accueil agent"
      onRetry={() => (retry ? retry() : reset?.())}
    />
  );
}
