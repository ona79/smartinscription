"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  AlertCircle,
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
import { registerAction, type AuthActionState } from "@/features/auth/actions";

const initialState: AuthActionState = {};

/** Formulaire d'inscription étudiant en deux colonnes sur desktop avec validation claire. */
export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state.success && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="prenom"
          name="prenom"
          label="Prénom"
          placeholder="Cheikh"
          autoComplete="given-name"
          required
          icon={<User className="h-4 w-4" />}
        />
        <FormField
          id="nom"
          name="nom"
          label="Nom"
          placeholder="Fall"
          autoComplete="family-name"
          required
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
        hint="Utile pour recevoir les alertes SMS de validation."
        icon={<Phone className="h-4 w-4" />}
      />

      <FormField
        id="email"
        name="email"
        type="email"
        label="Adresse e-mail"
        placeholder="cheikh.fall@exemple.sn"
        autoComplete="email"
        required
        icon={<Mail className="h-4 w-4" />}
      />

      <FormField
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        label="Mot de passe"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        minLength={6}
        hint="Au moins 6 caractères."
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

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        type={showConfirm ? "text" : "password"}
        label="Confirmer le mot de passe"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        minLength={6}
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
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <Button
        type="submit"
        disabled={isPending}
        className="mt-2 h-11 w-full rounded-xl bg-brand text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
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
