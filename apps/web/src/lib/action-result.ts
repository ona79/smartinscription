import { MESSAGES } from "@/lib/messages";

/**
 * Convention de retour UNIQUE des Server Actions :
 *   { ok: true, message?, data? }  ou  { ok: false, error, fieldErrors? }
 *
 * `error` et `message` sont TOUJOURS des messages utilisateur issus de `lib/messages.ts`.
 */
export type FieldErrors = Partial<Record<string, string>>;

export type ActionSuccess<T = undefined> = {
  ok: true;
  message?: string;
  data?: T;
};

export type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

export function actionOk<T = undefined>(message?: string, data?: T): ActionSuccess<T> {
  const result: ActionSuccess<T> = { ok: true };
  if (message) result.message = message;
  if (data !== undefined) result.data = data;
  return result;
}

export function actionError(error: string, fieldErrors?: FieldErrors): ActionFailure {
  const result: ActionFailure = { ok: false, error };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) result.fieldErrors = fieldErrors;
  return result;
}

export function isActionResult(value: unknown): value is ActionResult<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

/** Convertit les issues d'un `ZodError` en erreurs par champ (premier message par champ). */
export function zodFieldErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Échec de validation : message global générique + erreurs sous chaque champ. */
export function actionValidationError(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): ActionFailure {
  const fieldErrors = zodFieldErrors(error);
  const keys = Object.keys(fieldErrors);
  // Un seul champ en erreur : on affiche directement son message dans le toast.
  const message = keys.length === 1 ? fieldErrors[keys[0]]! : MESSAGES.generic.formInvalid;
  return actionError(message, fieldErrors);
}
