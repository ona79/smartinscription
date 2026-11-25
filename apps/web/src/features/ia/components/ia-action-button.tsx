"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { IaActionResult } from "@/features/ia/actions";

interface IaActionButtonProps {
  label: string;
  action: () => Promise<IaActionResult>;
}

/** Bouton d'action IA avec spinner et notification toast (succès ou échec). */
export function IaActionButton({ label, action }: IaActionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const res = await action();
        if (res.ok) {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      } catch {
        toast.error("Service IA indisponible, réessayez.");
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
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
