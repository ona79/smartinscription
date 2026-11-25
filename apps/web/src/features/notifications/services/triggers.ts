import {
  CURRENT_ACADEMIC_YEAR,
  NOTIFICATION_TYPES,
  REGISTRATION_FEE_FCFA,
  REGISTRATION_STATUSES,
} from "@smartinscription/shared";
import { buildNotificationEmail } from "@/features/notifications/services/email-template";
import {
  notify,
  type NotifyUserInput,
} from "@/features/notifications/services/notification-service";
import { prisma } from "@/lib/prisma";

export type NotifyFn = (input: NotifyUserInput) => Promise<void>;

/** Déclencheur : confirmation de paiement. */
export async function notifyPaymentConfirmed(
  params: { userId: string; email: string; prenom: string; receiptNumber: string },
  notifyFn: NotifyFn = (input) => notify(input)
) {
  const emailContent = buildNotificationEmail({
    prenom: params.prenom,
    title: `Confirmation de paiement — Reçu ${params.receiptNumber}`,
    bodyHtml: `<p>Votre paiement de <strong>25 000 FCFA</strong> est confirmé (reçu <strong>${params.receiptNumber}</strong>).</p>`,
    bodyText: `Votre paiement de 25 000 FCFA est confirmé (reçu ${params.receiptNumber}).`,
    ctaLabel: "Voir mon reçu et QR code",
    ctaHref: "/etudiant/paiement",
  });

  await notifyFn({
    userId: params.userId,
    email: params.email,
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    message: `Votre paiement de ${REGISTRATION_FEE_FCFA.toLocaleString("fr-FR")} FCFA est confirmé (Reçu ${params.receiptNumber}).`,
    emailSubject: `Confirmation de paiement — Reçu ${params.receiptNumber}`,
    emailHtml: emailContent.html,
    emailText: emailContent.text,
  });
}

/** Déclencheur : rendez-vous programmé. */
export async function notifyAppointmentScheduled(
  params: { userId: string; email: string; prenom: string; formattedSlot: string },
  notifyFn: NotifyFn = (input) => notify(input)
) {
  const emailContent = buildNotificationEmail({
    prenom: params.prenom,
    title: "Confirmation de rendez-vous — SmartInscription IA",
    bodyHtml: `<p>Votre rendez-vous est fixé au <strong>${params.formattedSlot}</strong>.</p>`,
    bodyText: `Votre rendez-vous est fixé au ${params.formattedSlot}.`,
    ctaLabel: "Voir mon rendez-vous",
    ctaHref: "/etudiant/rendez-vous",
  });

  await notifyFn({
    userId: params.userId,
    email: params.email,
    type: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
    message: `Votre rendez-vous est confirmé pour le ${params.formattedSlot}.`,
    emailSubject: "Confirmation de rendez-vous — SmartInscription IA",
    emailHtml: emailContent.html,
    emailText: emailContent.text,
  });
}

/** Déclencheur : dossier incomplet / pièce rejetée par l'agent. */
export async function notifyDossierIncomplete(
  params: { userId: string; email: string; prenom: string; reason: string },
  notifyFn: NotifyFn = (input) => notify(input)
) {
  const emailContent = buildNotificationEmail({
    prenom: params.prenom,
    title: "Action requise : dossier incomplet",
    bodyHtml: `<p>Votre dossier est incomplet : <strong>${params.reason}</strong>.</p>`,
    bodyText: `Votre dossier est incomplet : ${params.reason}.`,
    ctaLabel: "Corriger mes pièces",
    ctaHref: "/etudiant/documents",
  });

  await notifyFn({
    userId: params.userId,
    email: params.email,
    type: NOTIFICATION_TYPES.DOCUMENT_REJECTED,
    message: `Votre dossier est incomplet : ${params.reason}`,
    emailSubject: "Action requise : dossier incomplet",
    emailHtml: emailContent.html,
    emailText: emailContent.text,
  });
}

/** Déclencheur : inscription validée définitivement. */
export async function notifyRegistrationValidated(
  params: { userId: string; email: string; prenom: string },
  notifyFn: NotifyFn = (input) => notify(input)
) {
  const emailContent = buildNotificationEmail({
    prenom: params.prenom,
    title: "Inscription universitaire validée",
    bodyHtml: `<p>Votre inscription universitaire est <strong>validée définitivement</strong>.</p>`,
    bodyText: "Votre inscription universitaire est validée définitivement.",
    ctaLabel: "Consulter mon dossier",
    ctaHref: "/etudiant/dossier",
  });

  await notifyFn({
    userId: params.userId,
    email: params.email,
    type: NOTIFICATION_TYPES.REGISTRATION_VALIDATED,
    message: "Félicitations ! Votre inscription universitaire est validée définitivement.",
    emailSubject: "Inscription universitaire validée",
    emailHtml: emailContent.html,
    emailText: emailContent.text,
  });
}

/** Calcule J-N avant la clôture des inscriptions (null si hors fenêtre). */
export function computeReminderDaysLeft(
  closeDateIso: string,
  now = new Date()
): 7 | 3 | 1 | null {
  const closeDate = new Date(`${closeDateIso}T23:59:59.000Z`);
  if (Number.isNaN(closeDate.getTime())) return null;

  const startToday = new Date(now);
  startToday.setUTCHours(0, 0, 0, 0);
  const startClose = new Date(closeDate);
  startClose.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (startClose.getTime() - startToday.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
    return diffDays;
  }
  return null;
}

/** Envoie les rappels J-7, J-3, J-1 de façon idempotente aux inscriptions non validées. */
export async function sendClosingReminders(
  params: { closeDateIso?: string; now?: Date } = {},
  deps: { db?: typeof prisma; notifyFn?: NotifyFn } = {}
): Promise<{ daysLeft: number | null; sentCount: number }> {
  const closeDateIso = params.closeDateIso ?? process.env.REGISTRATION_CLOSE_DATE ?? "";
  const daysLeft = computeReminderDaysLeft(closeDateIso, params.now);

  if (!daysLeft) {
    return { daysLeft: null, sentCount: 0 };
  }

  const db = deps.db ?? prisma;
  const notifyFn = deps.notifyFn ?? ((input) => notify(input, { db }));
  const marker = `[J-${daysLeft}]`;

  const pendingRegistrations = await db.registration.findMany({
    where: {
      anneeAcademique: CURRENT_ACADEMIC_YEAR,
      statut: {
        notIn: [REGISTRATION_STATUSES.VALIDATED, REGISTRATION_STATUSES.REJECTED],
      },
    },
    include: {
      student: { include: { user: true } },
    },
  });

  let sentCount = 0;

  for (const reg of pendingRegistrations) {
    const user = reg.student.user;
    const alreadySent = await db.notification.findFirst({
      where: {
        userId: user.id,
        type: NOTIFICATION_TYPES.REMINDER,
        message: { contains: marker },
      },
    });

    if (alreadySent) continue;

    await notifyFn({
      userId: user.id,
      email: user.email,
      type: NOTIFICATION_TYPES.REMINDER,
      message: `${marker} Rappel : il reste ${daysLeft} jour(s) avant la clôture des inscriptions.`,
      emailSubject: `Rappel J-${daysLeft} : finalisez votre inscription`,
      emailHtml: `<p>Bonjour ${user.prenom},</p><p>Il vous reste <strong>${daysLeft} jour(s)</strong> pour finaliser votre inscription universitaire.</p>`,
    });
    sentCount += 1;
  }

  return { daysLeft, sentCount };
}
