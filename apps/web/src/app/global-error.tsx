"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error-fallback";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}

export default function GlobalError({ error, retry, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[error][global]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-dvh bg-[#f8fafc] font-sans text-[#0f172a] antialiased">
        <main className="flex min-h-dvh items-center justify-center p-4">
          <ErrorFallback
            reference={error.digest}
            backHref="/"
            onRetry={() => (retry ? retry() : reset?.())}
          />
        </main>
      </body>
    </html>
  );
}
