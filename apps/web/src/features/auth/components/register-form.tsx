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
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.ok && state.message && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="prenom"
          name="prenom"
          label="Prénom"
          placeholder="Cheikh"
          autoComplete="given-name"
          enterKeyHint="next"
          required
          error={fieldErrors.prenom}
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
          icon={<User className="h-4 w-4" />}
        />
      </div>

      <FormField
        id="telephone"
        name="telephone"
        type="tel"
        label="Téléphone (optionnel)"
        placeholder="+221 77 000 00 00"
        autoComplete="tel"
        inputMode="tel"
        enterKeyHint="next"
        hint="Format Sénégal : +221 suivi de 70, 75, 76, 77 ou 78 et 7 chiffres."
        error={fieldErrors.telephone}
        icon={<Phone className="h-4 w-4" />}
      />

      <FormField
        id="email"
        name="email"
        type="email"
        label="Adresse e-mail"
        placeholder="cheikh.fall@exemple.sn"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="off"
        autoCorrect="off"
        enterKeyHint="next"
        required
        error={fieldErrors.email}
        icon={<Mail className="h-4 w-4" />}
      />

      <div className="space-y-2">
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

        <ul className="space-y-1 text-xs" aria-live="polite">
          <li
            className={cn(
              "flex items-center gap-1.5",
              hasMinLength ? "text-success" : "text-muted-foreground"
            )}
          >
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>Au moins 8 caractères</span>
          </li>
        </ul>
      </div>

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        type={showConfirm ? "text" : "password"}
        label="Confirmer le mot de passe"
        placeholder="••••••••"
        autoComplete="new-password"
        enterKeyHint="done"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword}
        hint={
          confirmPassword.length > 0 && passwordsMatch
            ? "Les mots de passe correspondent."
            : undefined
        }
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
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <div className="space-y-1.5">
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed text-foreground">
          <input
            type="checkbox"
            name="acceptPrivacy"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-brand"
          />
          <span>
            J&apos;ai lu et j&apos;accepte la{" "}
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
