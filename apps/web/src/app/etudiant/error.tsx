"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error-fallback";

interface SegmentErrorProps {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}

export default function StudentError({ error, retry, reset }: SegmentErrorProps) {
  useEffect(() => {
    console.error("[error][etudiant]", error);
  }, [error]);

  return (
    <ErrorFallback
      reference={error.digest}
      backHref="/etudiant"
      backLabel="Retour à mon espace"
      onRetry={() => (retry ? retry() : reset?.())}
    />
  );
}
