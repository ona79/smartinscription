"use server";

import { ROLES } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/lib/session";
import { actionOk, type ActionResult } from "@/lib/action-result";
import { toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

/** Marque une notification comme lue (uniquement si elle appartient à l'utilisateur). */
export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult> {
  const user = await requireRole([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);

  try {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
      },
      data: { lu: true },
    });
    revalidatePath("/etudiant");
    return actionOk(MESSAGES.notifications.markedRead);
  } catch (error) {
    return toActionError(error, "notifications.markRead");
  }
}

/** Marque toutes les notifications de l'utilisateur comme lues. */
export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireRole([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);

  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, lu: false },
      data: { lu: true },
    });
    revalidatePath("/etudiant");
    return actionOk(MESSAGES.notifications.allRead);
  } catch (error) {
    return toActionError(error, "notifications.markAllRead");
  }
}
