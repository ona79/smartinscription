"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, KeyRound, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  unlockTestAccountsAction,
  type TestAccountItem,
} from "@/features/auth/actions";

interface TestAccountsHelperProps {
  onSelectAccount: (email: string, password: string) => void;
}

/** Petit panneau déverrouillable par mot de passe pour faciliter les tests de l'équipe. */
export function TestAccountsHelper({ onSelectAccount }: TestAccountsHelperProps) {
  const [expanded, setExpanded] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TestAccountItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await unlockTestAccountsAction(passcode);
      if (!result.ok || !result.accounts) {
        setError(result.error ?? "Code d'accès incorrect.");
        return;
      }
      setAccounts(result.accounts);
      setPasscode("");
    });
  }

  return (
    <div className="pt-2">
      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground"
        >
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          Comptes de test
          {expanded ? (
            <ChevronUp className="ml-1 h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 rounded-2xl border border-border/80 bg-muted/30 p-4">
          {!accounts ? (
            <form onSubmit={handleUnlock} className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Entrez le code d&apos;accès pour afficher les comptes de test
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Code d'accès..."
                  className="h-9 rounded-xl bg-surface text-xs"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="h-9 shrink-0 rounded-xl bg-brand px-3.5 text-xs font-semibold text-brand-foreground hover:bg-brand-dark"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Valider"
                  )}
                </Button>
              </div>
              {error && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-foreground">
                Cliquez sur un compte pour pré-remplir :
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.email}
                    className="flex min-w-0 flex-col justify-between gap-1.5 rounded-lg border border-border/80 bg-surface p-2 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
                          {acc.roleLabel}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectAccount(acc.email, acc.password)}
                          className="h-5 shrink-0 rounded-md px-1.5 text-[10px]"
                        >
                          Remplir
                        </Button>
                      </div>
                      <p
                        title={acc.email}
                        className="truncate font-mono text-[10px] text-foreground"
                      >
                        {acc.email}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {acc.password}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
