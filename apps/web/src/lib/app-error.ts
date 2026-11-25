import { actionError, type ActionFailure, type FieldErrors } from "@/lib/action-result";
import { MESSAGES } from "@/lib/messages";

/**
 * Erreur métier dont le message est DESTINÉ à l'utilisateur (issu de `lib/messages.ts`).
 * Toute autre erreur est considérée comme technique : journalisée côté serveur avec une
 * référence, et remplacée à l'écran par un message générique.
 */
export class AppError extends Error {
  readonly userMessage: string;
  readonly fieldErrors?: FieldErrors;
  readonly kind: "business" | "forbidden" | "not_found" | "rate_limited" | "unavailable";

  constructor(
    userMessage: string,
    options: {
      kind?: AppError["kind"];
      fieldErrors?: FieldErrors;
      cause?: unknown;
    } = {}
  ) {
    super(userMessage, { cause: options.cause });
    this.name = "AppError";
    this.userMessage = userMessage;
    this.kind = options.kind ?? "business";
    this.fieldErrors = options.fieldErrors;
  }
}

export const forbiddenError = () =>
  new AppError(MESSAGES.generic.forbidden, { kind: "forbidden" });
export const notFoundError = (message: string = MESSAGES.generic.notFound) =>
  new AppError(message, { kind: "not_found" });
export const rateLimitedError = (message: string = MESSAGES.generic.rateLimited) =>
  new AppError(message, { kind: "rate_limited" });

/** Génère une référence courte lisible (ex. « ERR-7K2F9Q ») à citer au support. */
export function createErrorReference(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `ERR-${random.slice(0, 6).toUpperCase()}`;
}

/** Journalise une erreur technique côté serveur et retourne la référence associée. */
export function logServerError(error: unknown, context: string): string {
  const reference = createErrorReference();
  console.error(`[error][${reference}] ${context}`, error);
  return reference;
}

/** Erreurs internes de Next.js (redirect, notFound…) qu'il ne faut jamais intercepter. */
function isNextInternalError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") ||
      digest === "NEXT_NOT_FOUND" ||
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING")
  );
}

/**
 * Transforme n'importe quelle erreur levée dans une Server Action en `ActionFailure`
 * sûre pour l'affichage. Relance les erreurs internes Next.js (redirect vers /connexion…).
 */
export function toActionError(error: unknown, context: string): ActionFailure {
  if (isNextInternalError(error)) {
    throw error;
  }
  if (error instanceof AppError) {
    return actionError(error.userMessage, error.fieldErrors);
  }
  const reference = logServerError(error, context);
  return actionError(MESSAGES.generic.unexpectedWithRef(reference));
}
