"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { MESSAGES } from "@/lib/messages";

export interface ToastApi {
  success: (message: string) => unknown;
  error: (message: string) => unknown;
}

export interface NotifyOptions {
  /** Message de succès par défaut si l'action n'en renvoie pas. */
  successMessage?: string;
  /** N'affiche aucun toast de succès (ex. la page affiche déjà un état de confirmation). */
  silentSuccess?: boolean;
  /** N'affiche pas de toast d'erreur (ex. erreur déjà visible sous un champ unique). */
  silentError?: boolean;
}

/**
 * Affiche le toast correspondant au résultat d'une action. Fonction pure (toast injectable)
 * pour être testée sans navigateur. Retourne le message affiché, ou null.
 */
export function notifyActionResult(
  result: ActionResult<unknown> | null | undefined,
  options: NotifyOptions = {},
  api: ToastApi = toast
): string | null {
  if (!result) return null;
  if (result.ok) {
    const message = result.message ?? options.successMessage;
    if (!message || options.silentSuccess) return null;
    api.success(message);
    return message;
  }
  if (options.silentError) return null;
  const message = result.error || MESSAGES.generic.unexpected;
  api.error(message);
  return message;
}

/** Erreurs réseau côté navigateur (fetch interrompu, Server Action injoignable). */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TypeError" ||
    /network|fetch|failed to fetch|load failed|connexion/i.test(error.message)
  );
}

export interface UseActionToastOptions<T> extends NotifyOptions {
  onSuccess?: (result: Extract<ActionResult<T>, { ok: true }>) => void;
  onError?: (result: Extract<ActionResult<T>, { ok: false }>) => void;
}

/**
 * Hook partagé pour appeler une Server Action depuis un bouton / gestionnaire :
 * - `isPending` pour désactiver le bouton (anti double-clic) ;
 * - toast de succès / d'erreur automatique ;
 * - `fieldErrors` à afficher sous les champs concernés ;
 * - les exceptions réseau sont converties en message utilisateur.
 */
export function useActionToast<Args extends unknown[], T = undefined>(
  action: (...args: Args) => Promise<ActionResult<T>>,
  options: UseActionToastOptions<T> = {}
) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ActionResult<T> | null>(null);
  const runningRef = useRef(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const run = useCallback(
    (...args: Args): Promise<ActionResult<T> | null> => {
      // Anti double-clic : on ignore un second appel tant que le premier n'est pas terminé.
      if (runningRef.current) return Promise.resolve(null);
      runningRef.current = true;

      return new Promise((resolve) => {
        startTransition(async () => {
          let next: ActionResult<T>;
          try {
            next = await action(...args);
          } catch (error) {
            next = {
              ok: false,
              error: isNetworkError(error) ? MESSAGES.generic.network : MESSAGES.generic.unexpected,
            };
          } finally {
            runningRef.current = false;
          }
          const opts = optionsRef.current;
          setResult(next);
          setFieldErrors(next.ok ? {} : (next.fieldErrors ?? {}));
          notifyActionResult(next, opts);
          if (next.ok) opts.onSuccess?.(next);
          else opts.onError?.(next);
          resolve(next);
        });
      });
    },
    [action]
  );

  const reset = useCallback(() => {
    setFieldErrors({});
    setResult(null);
  }, []);

  return { run, isPending, fieldErrors, result, reset };
}

/**
 * Variante pour les formulaires `<form action={...}>` basés sur `useActionState`.
 * L'action reçoit `(prevState, formData)` et renvoie un `ActionResult`.
 */
export function useFormActionToast<T = undefined>(
  action: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>,
  options: UseActionToastOptions<T> = {}
) {
  const [state, formAction, isPending] = useActionState(action, null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!state) return;
    const opts = optionsRef.current;
    notifyActionResult(state, opts);
    if (state.ok) opts.onSuccess?.(state);
    else opts.onError?.(state);
  }, [state]);

  const fieldErrors: FieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return { state, formAction, isPending, fieldErrors };
}
