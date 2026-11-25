export const REGISTRATION_FEE_FCFA = 25000;

export const CURRENT_ACADEMIC_YEAR = "2026-2027";

export const ACADEMIC_LEVELS = ["L1", "L2", "L3", "M1", "M2"] as const;
export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number];

export const ACADEMIC_LEVEL_LABELS_FR: Record<AcademicLevel, string> = {
  L1: "Licence 1 (L1)",
  L2: "Licence 2 (L2)",
  L3: "Licence 3 (L3)",
  M1: "Master 1 (M1)",
  M2: "Master 2 (M2)",
};

export const ROLES = {
  STUDENT: "STUDENT",
  AGENT: "AGENT",
  ADMIN: "ADMIN",
} as const;

export const ROLE_LABELS_FR: Record<Role, string> = {
  STUDENT: "Étudiant",
  AGENT: "Agent",
  ADMIN: "Administrateur",
};

export const ROLE_DEFAULT_ROUTES: Record<Role, string> = {
  STUDENT: "/etudiant",
  AGENT: "/agent",
  ADMIN: "/admin",
};

export const REGISTRATION_STATUSES = {
  DRAFT: "DRAFT",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  DOCS_INCOMPLETE: "DOCS_INCOMPLETE",
  DOCS_COMPLETE: "DOCS_COMPLETE",
  VALIDATED: "VALIDATED",
  REJECTED: "REJECTED",
} as const;

export const REGISTRATION_STATUS_LABELS_FR: Record<RegistrationStatus, string> = {
  DRAFT: "Brouillon",
  PENDING_PAYMENT: "En attente de paiement",
  PAID: "Payé",
  DOCS_INCOMPLETE: "Dossier incomplet",
  DOCS_COMPLETE: "Dossier complet",
  VALIDATED: "Validé",
  REJECTED: "Rejeté",
};

export const PAYMENT_METHODS = {
  ORANGE_MONEY: "ORANGE_MONEY",
  WAVE: "WAVE",
  FREE_MONEY: "FREE_MONEY",
  WIZALL: "WIZALL",
  CARD: "CARD",
} as const;

export const PAYMENT_METHOD_LABELS_FR: Record<PaymentMethod, string> = {
  ORANGE_MONEY: "Orange Money",
  WAVE: "Wave",
  FREE_MONEY: "Free Money",
  WIZALL: "Wizall",
  CARD: "Carte bancaire",
};

export const PAYMENT_STATUSES = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export const PAYMENT_STATUS_LABELS_FR: Record<PaymentStatus, string> = {
  PENDING: "En attente",
  SUCCESS: "Réussi",
  FAILED: "Échoué",
};

export const DOCUMENT_TYPES = {
  ID_CARD: "ID_CARD",
  TRANSCRIPT: "TRANSCRIPT",
  DIPLOMA: "DIPLOMA",
  PHOTO: "PHOTO",
} as const;

export const DOCUMENT_TYPE_LABELS_FR: Record<DocumentType, string> = {
  ID_CARD: "Pièce d'identité",
  TRANSCRIPT: "Relevé de notes",
  DIPLOMA: "Diplôme / Attestation",
  PHOTO: "Photo d'identité",
};

export const DOCUMENT_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const APPOINTMENT_STATUSES = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
} as const;

export const NOTIFICATION_TYPES = {
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  DOCUMENT_APPROVED: "DOCUMENT_APPROVED",
  DOCUMENT_REJECTED: "DOCUMENT_REJECTED",
  APPOINTMENT_CONFIRMED: "APPOINTMENT_CONFIRMED",
  REGISTRATION_VALIDATED: "REGISTRATION_VALIDATED",
  REGISTRATION_REJECTED: "REGISTRATION_REJECTED",
  REMINDER: "REMINDER",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type RegistrationStatus =
  (typeof REGISTRATION_STATUSES)[keyof typeof REGISTRATION_STATUSES];
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];
export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[keyof typeof DOCUMENT_STATUSES];
export type AppointmentStatus =
  (typeof APPOINTMENT_STATUSES)[keyof typeof APPOINTMENT_STATUSES];
