"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Landmark, Loader2, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listTestAccountsAction,
  type TestAccountItem,
} from "@/features/auth/actions";

interface TestAccountsHelperProps {
  onSelectAccount: (email: string, password: string) => void;
}

function getProfileVisual(email: string) {
  if (email.startsWith("admin@")) {
    return {
      icon: Shield,
      boxClass: "border-blue-200 bg-blue-50 text-blue-600",
    };
  }
  if (email.startsWith("agent@")) {
    return {
      icon: Landmark,
      boxClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  return {
    icon: GraduationCap,
    boxClass: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

/** Fenêtre modale affichant directement les comptes de test à préremplir (sans mot de passe). */
export function TestAccountsHelper({ onSelectAccount }: TestAccountsHelperProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TestAccountItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    if (accounts) return;
    setError(null);
    startTransition(async () => {
      const result = await listTestAccountsAction();
      if (!result.ok || !result.accounts) {
        setError(result.error ?? "Impossible de charger les comptes de test.");
        return;
      }
      setAccounts(result.accounts);
    });
  }

  function handleSelect(acc: TestAccountItem) {
    onSelectAccount(acc.email, acc.password);
    setOpen(false);
  }

  return (
    <div className="pt-1">
      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleOpen}
          className="h-8 rounded-full px-3.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Comptes de test
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Comptes de test
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sélectionnez un profil pour préremplir les identifiants.
            </DialogDescription>
          </DialogHeader>

          {isPending && !accounts ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement des profils...
            </div>
          ) : error ? (
            <p role="alert" className="py-4 text-center text-xs font-medium text-destructive">
              {error}
            </p>
          ) : (
            <div className="space-y-2.5 pt-1">
              {(accounts ?? []).map((acc) => {
                const { icon: Icon, boxClass } = getProfileVisual(acc.email);
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelect(acc)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:border-brand/40 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${boxClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {acc.roleLabel}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {acc.email}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-brand">
                      Préremplir
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
