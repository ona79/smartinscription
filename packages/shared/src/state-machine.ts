import { REGISTRATION_STATUSES, type RegistrationStatus } from "./constants";

/** Transitions autorisées pour le statut d'une inscription universitaire. */
const ALLOWED_TRANSITIONS: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  [REGISTRATION_STATUSES.DRAFT]: [REGISTRATION_STATUSES.PENDING_PAYMENT],
  [REGISTRATION_STATUSES.PENDING_PAYMENT]: [REGISTRATION_STATUSES.PAID],
  [REGISTRATION_STATUSES.PAID]: [
    REGISTRATION_STATUSES.DOCS_INCOMPLETE,
    REGISTRATION_STATUSES.DOCS_COMPLETE,
  ],
  [REGISTRATION_STATUSES.DOCS_INCOMPLETE]: [
    REGISTRATION_STATUSES.DOCS_COMPLETE,
    REGISTRATION_STATUSES.REJECTED,
  ],
  [REGISTRATION_STATUSES.DOCS_COMPLETE]: [
    REGISTRATION_STATUSES.DOCS_INCOMPLETE,
    REGISTRATION_STATUSES.VALIDATED,
    REGISTRATION_STATUSES.REJECTED,
  ],
  [REGISTRATION_STATUSES.VALIDATED]: [],
  [REGISTRATION_STATUSES.REJECTED]: [],
};

/** Vérifie si la transition d'un statut d'inscription vers un autre est autorisée. */
export function canTransition(
  from: RegistrationStatus,
  to: RegistrationStatus
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
