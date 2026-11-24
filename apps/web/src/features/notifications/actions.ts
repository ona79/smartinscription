"use server";

import { ROLES } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/lib/session";
import { prisma } from "@/lib/prisma";

/** Marque une notification comme lue (uniquement si elle appartient à l'utilisateur). */
export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await requireRole([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
    },
    data: { lu: true },
  });

  revalidatePath("/etudiant");
}

/** Marque toutes les notifications de l'utilisateur comme lues. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireRole([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);

  await prisma.notification.updateMany({
    where: { userId: user.id, lu: false },
    data: { lu: true },
  });

  revalidatePath("/etudiant");
}
