"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error-fallback";

interface SegmentErrorProps {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}

export default function AdminError({ error, retry, reset }: SegmentErrorProps) {
  useEffect(() => {
    console.error("[error][admin]", error);
  }, [error]);

  return (
    <ErrorFallback
      reference={error.digest}
      backHref="/admin"
      backLabel="Retour à l'administration"
      onRetry={() => (retry ? retry() : reset?.())}
    />
  );
}
