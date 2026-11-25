"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { loginAction, type AuthActionState } from "@/features/auth/actions";
import { TestAccountsHelper } from "@/features/auth/components/test-accounts-helper";

const initialState: AuthActionState = {};

/** Formulaire de connexion minimaliste avec icônes, bascule mot de passe et aide comptes de test. */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        {state.error && (
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
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
        />

        <FormField
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Mot de passe"
          placeholder="••••••••"
          autoComplete="current-password"
          required
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
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <Button
          type="submit"
          disabled={isPending}
          className="h-10 w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
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

      <TestAccountsHelper
        onSelectAccount={(selectedEmail, selectedPassword) => {
          setEmail(selectedEmail);
          setPassword(selectedPassword);
        }}
      />
    </div>
  );
}
