"use client";

import { useActionState, useState } from "react";
import {
  PAYMENT_METHOD_LABELS_FR,
  PAYMENT_METHODS,
  REGISTRATION_FEE_FCFA,
  type PaymentMethod,
} from "@smartinscription/shared";
import { AlertCircle, CreditCard, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startPaymentAction,
  type PaymentActionState,
} from "@/features/paiement/actions";
import { cn } from "@/lib/utils";

const METHOD_LIST = Object.values(PAYMENT_METHODS) as PaymentMethod[];
const initialState: PaymentActionState = {};

/** Sélecteur compact des 5 moyens de paiement avec montant fixe côté serveur. */
export function PaymentMethodForm() {
  const [state, formAction, isPending] = useActionState(startPaymentAction, initialState);
  const [selected, setSelected] = useState<PaymentMethod>(PAYMENT_METHODS.ORANGE_MONEY);

  return (
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

      <input type="hidden" name="moyen" value={selected} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METHOD_LIST.map((method) => {
          const isSelected = selected === method;
          const Icon = method === PAYMENT_METHODS.CARD ? CreditCard : Smartphone;
          return (
            <button
              key={method}
              type="button"
              onClick={() => setSelected(method)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-brand bg-accent/70 ring-1 ring-brand"
                  : "border-border bg-surface hover:border-brand/50"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {PAYMENT_METHOD_LABELS_FR[method]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto sm:px-6"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirection vers le paiement...
          </>
        ) : (
          `Payer ${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA`
        )}
      </Button>
    </form>
  );
}
