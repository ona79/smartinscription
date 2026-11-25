"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface AutoRefreshProps {
  intervalMs?: number;
}

/** Rafraîchit périodiquement les Server Components (30s par défaut). */
export function AutoRefresh({ intervalMs = 30_000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5" />
      Actualisation auto (30 s)
    </span>
  );
}
