import {
  NOTIFICATION_TYPES,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import { buildNotificationEmail } from "@/features/notifications/services/email-template";
import { notifyUser } from "@/features/notifications/services/notification-service";
import { AppError, forbiddenError, notFoundError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

const BU_ELIGIBLE_STATUSES = new Set<RegistrationStatus>([
  REGISTRATION_STATUSES.PAID,
  REGISTRATION_STATUSES.DOCS_INCOMPLETE,
  REGISTRATION_STATUSES.DOCS_COMPLETE,
  REGISTRATION_STATUSES.VALIDATED,
]);

export function isBuEligibleStatus(status: RegistrationStatus): boolean {
  return BU_ELIGIBLE_STATUSES.has(status);
}

/**
 * Active ou désactive l'accès BU d'une inscription (AGENT ou ADMIN uniquement).
 * L'inscription doit être PAID ou plus avancée ; notifie l'étudiant une seule fois à l'activation.
 */
export async function updateRegistrationBuStatus(
  params: {
    registrationId: string;
    status: "NONE" | "ACTIVE";
    actorId: string;
    actorRole: Role;
    skipEmail?: boolean;
  },
  db: typeof prisma = prisma
) {
  if (params.actorRole !== ROLES.AGENT && params.actorRole !== ROLES.ADMIN) {
    throw forbiddenError();
  }

  const registration = await db.registration.findUnique({
    where: { id: params.registrationId },
    select: {
      id: true,
      anneeAcademique: true,
      statut: true,
      buStatus: true,
      student: {
        select: {
          user: { select: { id: true, email: true, prenom: true } },
        },
      },
    },
  });

  if (!registration) {
    throw notFoundError(MESSAGES.bu.notFound);
  }

  if (
    params.status === "ACTIVE" &&
    !isBuEligibleStatus(registration.statut as RegistrationStatus)
  ) {
    throw new AppError(MESSAGES.bu.paymentRequired);
  }

  const isActivating = params.status === "ACTIVE";
  const updated = await db.registration.update({
    where: { id: registration.id },
    data: {
      buStatus: params.status,
      buValidatedAt: isActivating ? new Date() : null,
      buValidatedById: isActivating ? params.actorId : null,
    },
    select: { id: true, buStatus: true, buValidatedAt: true },
  });

  if (isActivating) {
    const marker = `[BU:${registration.anneeAcademique}]`;
    const alreadyNotified = await db.notification.findFirst({
      where: {
        userId: registration.student.user.id,
        message: { contains: marker },
      },
      select: { id: true },
    });

    if (!alreadyNotified) {
      const emailContent = buildNotificationEmail({
        prenom: registration.student.user.prenom,
        title: "Accès Bibliothèque universitaire activé",
        bodyHtml: `<p>Votre accès à la <strong>Bibliothèque universitaire (BU)</strong> pour l'année ${registration.anneeAcademique} est maintenant <strong>actif</strong>.</p>`,
        bodyText: `Votre accès à la Bibliothèque universitaire (BU) pour l'année ${registration.anneeAcademique} est maintenant actif.`,
        ctaLabel: "Voir ma carte étudiante",
        ctaHref: "/etudiant/dossier",
      });

      await notifyUser(
        {
          userId: registration.student.user.id,
          email: registration.student.user.email,
          type: NOTIFICATION_TYPES.REGISTRATION_VALIDATED,
          message: `${marker} Votre accès à la Bibliothèque universitaire (BU) est activé.`,
          emailSubject: "Accès Bibliothèque universitaire (BU) activé",
          emailHtml: emailContent.html,
          emailText: emailContent.text,
        },
        { db, skipEmail: params.skipEmail }
      );
    }
  }

  return updated;
}
