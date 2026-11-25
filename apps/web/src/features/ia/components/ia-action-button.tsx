"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IaActionResult } from "@/features/ia/actions";
import { useActionToast } from "@/hooks/use-action-toast";

interface IaActionButtonProps {
  label: string;
  action: () => Promise<IaActionResult>;
}

/** Bouton d'action IA pleine largeur sur mobile, avec spinner et notification toast. */
export function IaActionButton({ label, action }: IaActionButtonProps) {
  const { run, isPending } = useActionToast(action);

  return (
    <Button
      type="button"
      onClick={() => run()}
      disabled={isPending}
      className="w-full rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
