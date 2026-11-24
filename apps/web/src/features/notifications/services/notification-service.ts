import { getEmailProvider } from "@/features/notifications/providers";
import { prisma } from "@/lib/prisma";

export interface NotifyUserInput {
  userId: string;
  email: string;
  type: string;
  message: string;
  emailSubject: string;
  emailHtml: string;
}

/**
 * Enregistre une notification en base et envoie un e-mail de manière non bloquante.
 */
export async function notifyUser(
  input: NotifyUserInput,
  deps: { db?: typeof prisma; skipEmail?: boolean } = {}
): Promise<void> {
  const db = deps.db ?? prisma;

  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      lu: false,
    },
  });

  if (deps.skipEmail) {
    return;
  }

  try {
    const provider = getEmailProvider();
    await provider.sendEmail({
      to: input.email,
      subject: input.emailSubject,
      html: input.emailHtml,
      text: input.message,
    });
  } catch (error) {
    console.warn("[notification] Erreur non bloquante lors de l'envoi d'e-mail:", error);
  }
}

/** Récupère les dernières notifications d'un utilisateur. */
export async function getUserNotifications(userId: string, limit = 10) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
