"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";

export function ForgotPasswordForm() {
  const { state, formAction, isPending, fieldErrors } = useFormActionToast(
    requestPasswordResetAction
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <FormField
        id="reset-email"
        name="email"
        type="email"
        label="Adresse e-mail"
        placeholder="etudiant@smartinscription.sn"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="off"
        autoCorrect="off"
        enterKeyHint="send"
        required
        error={fieldErrors.email}
        icon={<Mail className="h-4 w-4" />}
      />

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          "Envoyer le lien de réinitialisation"
        )}
      </Button>

      <p className="pt-1 text-center text-sm text-muted-foreground">
        <Link
          href="/connexion"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
