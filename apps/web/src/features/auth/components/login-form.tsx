"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/features/auth/actions";
import { TestAccountsHelper } from "@/features/auth/components/test-accounts-helper";
import { notifyActionResult, useFormActionToast } from "@/hooks/use-action-toast";
import { MESSAGES } from "@/lib/messages";

interface LoginFormProps {
  showTestAccounts?: boolean;
  reason?: string;
}

/** Formulaire de connexion avec toasts, bascule mot de passe, lien d'oubli et aide comptes de test. */
export function LoginForm({ showTestAccounts = false, reason }: LoginFormProps) {
  const { state, formAction, isPending, fieldErrors } = useFormActionToast(loginAction);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const notifiedReasonRef = useRef(false);

  const sessionExpired = reason === "session-expiree";

  useEffect(() => {
    if (sessionExpired && !notifiedReasonRef.current) {
      notifiedReasonRef.current = true;
      notifyActionResult({ ok: false, error: MESSAGES.generic.sessionExpired });
    }
  }, [sessionExpired]);

  return (
    <div className="space-y-4">
      {sessionExpired && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{MESSAGES.generic.sessionExpired}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {state && !state.ok && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <FormField
          id="email"
          name="email"
          type="email"
          label="Adresse e-mail"
          placeholder="etudiant@smartinscription.sn"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="next"
          required
          error={fieldErrors.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
        />

        <div className="space-y-1.5">
          <FormField
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            label="Mot de passe"
            placeholder="••••••••"
            autoComplete="current-password"
            enterKeyHint="go"
            required
            error={fieldErrors.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <div className="flex justify-end">
            <Link
              href="/mot-de-passe-oublie"
              className="inline-flex min-h-9 items-center text-xs font-medium text-brand underline-offset-4 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </Button>

        <p className="pt-1 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-semibold text-brand underline-offset-4 hover:underline"
          >
            Créer un compte étudiant
          </Link>
        </p>
      </form>

      {showTestAccounts && (
        <TestAccountsHelper
          onSelectAccount={(selectedEmail, selectedPassword) => {
            setEmail(selectedEmail);
            setPassword(selectedPassword);
          }}
        />
      )}
    </div>
  );
}
