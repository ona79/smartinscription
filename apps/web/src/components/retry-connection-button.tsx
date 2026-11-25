"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryConnectionButton() {
  return (
    <Button
      type="button"
      onClick={() => window.location.reload()}
      className="w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
    >
      <RotateCw className="mr-1.5 h-4 w-4" />
      Réessayer
    </Button>
  );
}
