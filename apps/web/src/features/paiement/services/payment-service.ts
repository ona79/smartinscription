import crypto from "node:crypto";
import {
  canTransition,
  CURRENT_ACADEMIC_YEAR,
  PAYMENT_STATUSES,
  REGISTRATION_FEE_FCFA,
  REGISTRATION_STATUSES,
  type PaymentMethod,
} from "@smartinscription/shared";
import { getPaymentProvider } from "@/features/paiement/providers";
import type { VerifiedWebhookResult } from "@/features/paiement/providers/types";
import { prisma } from "@/lib/prisma";

function generateProviderRef(): string {
  return `PAY-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Initialise un paiement PENDING pour l'inscription courante de l'étudiant.
 * Le montant est toujours fixé côté serveur (REGISTRATION_FEE_FCFA).
 */
export async function initiateStudentPayment(params: {
  userId: string;
  moyen: PaymentMethod;
}): Promise<{ checkoutUrl: string; providerRef: string }> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      student: {
        include: {
          registrations: {
            where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
            include: {
              payments: {
                orderBy: { createdAt: "desc" },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  const student = user?.student;
  const registration = student?.registrations[0];

  if (!user || !student || !registration) {
    throw new Error("Veuillez d'abord compléter votre dossier étudiant.");
  }

  // Interdit tout second paiement si un paiement SUCCESS existe déjà
  const alreadyPaid = registration.payments.some(
    (p) => p.statut === PAYMENT_STATUSES.SUCCESS
  );
  if (alreadyPaid || registration.statut === REGISTRATION_STATUSES.PAID) {
    throw new Error("Les frais d'inscription ont déjà été réglés pour cette année.");
  }

  // Idempotence anti-double-clic : réutilise un paiement PENDING récent pour le même moyen
  const existingPending = registration.payments.find(
    (p) => p.statut === PAYMENT_STATUSES.PENDING && p.moyen === params.moyen
  );

  const provider = getPaymentProvider();

  if (existingPending) {
    const checkout = await provider.createCheckout({
      paymentId: existingPending.id,
      providerRef: existingPending.providerRef,
      montant: existingPending.montant,
      moyen: existingPending.moyen as PaymentMethod,
      studentEmail: user.email,
      studentName: `${user.prenom} ${user.nom}`,
    });
    return checkout;
  }

  const providerRef = generateProviderRef();

  const payment = await prisma.$transaction(async (tx) => {
    if (registration.statut === REGISTRATION_STATUSES.DRAFT) {
      if (!canTransition(registration.statut, REGISTRATION_STATUSES.PENDING_PAYMENT)) {
        throw new Error("Transition de statut d'inscription non autorisée.");
      }
      await tx.registration.update({
        where: { id: registration.id },
        data: { statut: REGISTRATION_STATUSES.PENDING_PAYMENT },
      });
    }

    return tx.payment.create({
      data: {
        registrationId: registration.id,
        montant: REGISTRATION_FEE_FCFA,
        moyen: params.moyen,
        statut: PAYMENT_STATUSES.PENDING,
        providerRef,
      },
    });
  });

  console.info(
    `[paiement] Création paiement PENDING id=${payment.id} ref=${payment.providerRef} moyen=${payment.moyen}`
  );

  return provider.createCheckout({
    paymentId: payment.id,
    providerRef: payment.providerRef,
    montant: payment.montant,
    moyen: payment.moyen as PaymentMethod,
    studentEmail: user.email,
    studentName: `${user.prenom} ${user.nom}`,
  });
}

export interface ProcessWebhookOutcome {
  alreadyProcessed: boolean;
  paymentId: string;
  statut: string;
}

/**
 * Traite une notification webhook déjà vérifiée de manière strictement idempotente.
 */
export async function processVerifiedWebhook(
  webhookResult: VerifiedWebhookResult,
  deps: { db?: typeof prisma } = {}
): Promise<ProcessWebhookOutcome> {
  const db = deps.db ?? prisma;

  const payment = await db.payment.findUnique({
    where: { providerRef: webhookResult.providerRef },
    include: { registration: true },
  });

  if (!payment) {
    throw new Error(`Paiement introuvable pour la référence ${webhookResult.providerRef}.`);
  }

  // Idempotence stricte : un paiement déjà SUCCESS n'est jamais retraité
  if (payment.statut === PAYMENT_STATUSES.SUCCESS) {
    console.info(
      `[paiement] Webhook ignoré (déjà SUCCESS) id=${payment.id} ref=${payment.providerRef}`
    );
    return {
      alreadyProcessed: true,
      paymentId: payment.id,
      statut: payment.statut,
    };
  }

  if (webhookResult.outcome === "SUCCESS") {
    const updated = await db.$transaction(async (tx) => {
      // Vérifie qu'aucun autre paiement SUCCESS n'existe sur cette inscription
      const existingSuccess = await tx.payment.findFirst({
        where: {
          registrationId: payment.registrationId,
          statut: PAYMENT_STATUSES.SUCCESS,
        },
      });

      if (existingSuccess) {
        return existingSuccess;
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          statut: PAYMENT_STATUSES.SUCCESS,
          paidAt: new Date(),
        },
      });

      if (payment.registration.statut !== REGISTRATION_STATUSES.PAID) {
        if (!canTransition(payment.registration.statut, REGISTRATION_STATUSES.PAID)) {
          throw new Error(
            `Transition interdite de ${payment.registration.statut} vers PAID.`
          );
        }
        await tx.registration.update({
          where: { id: payment.registrationId },
          data: { statut: REGISTRATION_STATUSES.PAID },
        });
      }

      return updatedPayment;
    });

    console.info(
      `[paiement] Paiement confirmé SUCCESS id=${updated.id} ref=${updated.providerRef}`
    );

    return {
      alreadyProcessed: false,
      paymentId: updated.id,
      statut: updated.statut,
    };
  }

  const failedPayment = await db.payment.update({
    where: { id: payment.id },
    data: { statut: PAYMENT_STATUSES.FAILED },
  });

  console.info(
    `[paiement] Paiement échoué FAILED id=${failedPayment.id} ref=${failedPayment.providerRef}`
  );

  return {
    alreadyProcessed: false,
    paymentId: failedPayment.id,
    statut: failedPayment.statut,
  };
}
