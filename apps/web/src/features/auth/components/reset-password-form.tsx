"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { updatePasswordAction } from "@/features/auth/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const { state, formAction, isPending, fieldErrors } =
    useFormActionToast(updatePasswordAction);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
        <Link
          href="/connexion"
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark"
          )}
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <FormField
          id="new-password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Nouveau mot de passe"
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
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs",
            password.length >= 8 ? "text-success" : "text-muted-foreground"
          )}
        >
          <Check className="h-3.5 w-3.5" />
          <span>Au moins 8 caractères</span>
        </p>
      </div>

      <FormField
        id="confirm-new-password"
        name="confirmPassword"
        type={showPassword ? "text" : "password"}
        label="Confirmer le nouveau mot de passe"
        placeholder="••••••••"
        autoComplete="new-password"
        enterKeyHint="done"
        required
        minLength={8}
        error={fieldErrors.confirmPassword}
        icon={<Lock className="h-4 w-4" />}
      />

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Mise à jour...
          </>
        ) : (
          "Enregistrer le mot de passe"
        )}
      </Button>
    </form>
  );
}
