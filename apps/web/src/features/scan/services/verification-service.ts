import {
  PAYMENT_STATUSES,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 30;

const attemptStore = new Map<string, number[]>();

/** Limiteur de débit par utilisateur (fenêtre glissante de 60s). */
export function checkVerificationRateLimit(userId: string, now = Date.now()): boolean {
  const timestamps = attemptStore.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    attemptStore.set(userId, recent);
    return false;
  }

  recent.push(now);
  attemptStore.set(userId, recent);
  return true;
}

/** Extrait le jeton QR depuis une URL complète (/verification/<token>) ou une chaîne brute. */
export function extractQrToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return "";

  const marker = "/verification/";
  const idx = trimmed.indexOf(marker);
  if (idx !== -1) {
    const tail = trimmed.slice(idx + marker.length);
    return tail.split(/[?#]/)[0]?.trim() ?? "";
  }

  return trimmed;
}

export interface VerificationSuccessResult {
  valid: true;
  studentName: string;
  numeroEtudiant: string;
  ufrNom: string;
  filiereNom: string;
  niveau: string;
  anneeAcademique: string;
  receiptNumber: string;
  paidAt: string;
  montant: number;
  registrationStatus: RegistrationStatus;
  registrationStatusLabel: string;
  dossierState: "COMPLETE" | "INCOMPLETE" | "VALIDATED";
}

export interface VerificationFailureResult {
  valid: false;
  error: string;
}

export type VerificationResult =
  | VerificationSuccessResult
  | VerificationFailureResult;

/** Vérifie un jeton QR côté serveur (réservé aux rôles AGENT et ADMIN). */
export async function verifyReceiptByQrToken(
  params: {
    rawToken: string;
    requesterId: string;
    requesterRole: Role;
  },
  deps: { db?: typeof prisma; skipRateLimit?: boolean } = {}
): Promise<VerificationResult> {
  if (
    params.requesterRole !== ROLES.AGENT &&
    params.requesterRole !== ROLES.ADMIN
  ) {
    return {
      valid: false,
      error: "Accès refusé : vérification réservée aux agents et administrateurs.",
    };
  }

  if (!deps.skipRateLimit && !checkVerificationRateLimit(params.requesterId)) {
    return {
      valid: false,
      error: "Trop de tentatives de scan. Veuillez patienter une minute.",
    };
  }

  const qrToken = extractQrToken(params.rawToken);
  if (!qrToken || qrToken.length < 16) {
    return {
      valid: false,
      error: "Code QR invalide ou incomplet.",
    };
  }

  const db = deps.db ?? prisma;
  const payment = await db.payment.findUnique({
    where: { qrToken },
    include: {
      registration: {
        include: {
          student: {
            include: {
              user: true,
              ufr: true,
              filiere: true,
            },
          },
        },
      },
    },
  });

  if (
    !payment ||
    payment.statut !== PAYMENT_STATUSES.SUCCESS ||
    !payment.receiptNumber
  ) {
    // Message volontairement générique sans fuite d'information
    return {
      valid: false,
      error: "Reçu introuvable ou paiement non confirmé.",
    };
  }

  const reg = payment.registration;
  const student = reg.student;
  const regStatus = reg.statut as RegistrationStatus;

  const dossierState =
    regStatus === REGISTRATION_STATUSES.VALIDATED
      ? "VALIDATED"
      : regStatus === REGISTRATION_STATUSES.DOCS_COMPLETE
        ? "COMPLETE"
        : "INCOMPLETE";

  return {
    valid: true,
    studentName: `${student.user.prenom} ${student.user.nom}`,
    numeroEtudiant: student.numeroEtudiant,
    ufrNom: student.ufr.nom,
    filiereNom: student.filiere.nom,
    niveau: student.niveau,
    anneeAcademique: reg.anneeAcademique,
    receiptNumber: payment.receiptNumber,
    paidAt: (payment.paidAt ?? payment.createdAt).toISOString(),
    montant: payment.montant,
    registrationStatus: regStatus,
    registrationStatusLabel: REGISTRATION_STATUS_LABELS_FR[regStatus],
    dossierState,
  };
}
