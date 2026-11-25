"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { registerAction } from "@/features/auth/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";

/** Formulaire d'inscription étudiant avec règles mot de passe en direct, téléphone Sénégal et consentement. */
export function RegisterForm() {
  const { state, formAction, isPending, fieldErrors } = useFormActionToast(registerAction);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <form action={formAction} className="space-y-2.5 sm:space-y-3.5">
      {state && !state.ok && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.ok && state.message && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <FormField
          id="prenom"
          name="prenom"
          label="Prénom"
          placeholder="Cheikh"
          autoComplete="given-name"
          enterKeyHint="next"
          required
          error={fieldErrors.prenom}
          className="h-10"
          icon={<User className="h-4 w-4" />}
        />
        <FormField
          id="nom"
          name="nom"
          label="Nom"
          placeholder="Fall"
          autoComplete="family-name"
          enterKeyHint="next"
          required
          error={fieldErrors.nom}
          className="h-10"
          icon={<User className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <FormField
          id="telephone"
          name="telephone"
          type="tel"
          label="Téléphone (opt.)"
          placeholder="+221 77 000 00 00"
          autoComplete="tel"
          inputMode="tel"
          enterKeyHint="next"
          error={fieldErrors.telephone}
          className="h-10"
          icon={<Phone className="h-4 w-4" />}
        />

        <FormField
          id="email"
          name="email"
          type="email"
          label="Adresse e-mail"
          placeholder="cheikh@exemple.sn"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="next"
          required
          error={fieldErrors.email}
          className="h-10"
          icon={<Mail className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <FormField
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Mot de passe"
          placeholder="••••••••"
          autoComplete="new-password"
          enterKeyHint="next"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          className="h-10"
          icon={<Lock className="h-4 w-4" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
              }
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <FormField
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirm ? "text" : "password"}
          label="Confirmation"
          placeholder="••••••••"
          autoComplete="new-password"
          enterKeyHint="done"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          className="h-10"
          icon={<Lock className="h-4 w-4" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={
                showConfirm
                  ? "Masquer la confirmation du mot de passe"
                  : "Afficher la confirmation du mot de passe"
              }
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-live="polite">
        <span
          className={cn(
            "flex items-center gap-1",
            hasMinLength ? "text-success" : "text-muted-foreground"
          )}
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          8 caractères min.
        </span>
        {confirmPassword.length > 0 && passwordsMatch && (
          <span className="flex items-center gap-1 text-success">
            <Check className="h-3.5 w-3.5 shrink-0" />
            Identiques
          </span>
        )}
      </div>

      <div className="space-y-1">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2 text-xs leading-snug text-foreground">
          <input
            type="checkbox"
            name="acceptPrivacy"
            required
            className="h-4 w-4 shrink-0 rounded border-input accent-brand"
          />
          <span>
            J&apos;accepte la{" "}
            <Link
              href="/confidentialite"
              className="font-semibold text-brand underline-offset-4 hover:underline"
            >
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        <div aria-live="polite" aria-atomic="true">
          {fieldErrors.acceptPrivacy && (
            <p className="text-xs font-medium text-destructive">
              {fieldErrors.acceptPrivacy}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="mt-1 w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Création du compte...
          </>
        ) : (
          "Créer mon compte"
        )}
      </Button>

      <p className="pt-1 text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link
          href="/connexion"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
