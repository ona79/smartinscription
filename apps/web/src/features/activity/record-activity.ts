import type { ActivityType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Enregistre un événement d'activité (LOGIN ou CHECK_IN) sans jamais faire échouer l'appelant.
 * Met à jour User.lastLoginAt lors d'une connexion LOGIN.
 */
export async function recordActivity(
  type: ActivityType,
  userId: string | null,
  meta?: Record<string, unknown>,
  deps: { db?: typeof prisma } = {}
): Promise<void> {
  const db = deps.db ?? prisma;

  try {
    await db.activityLog.create({
      data: {
        type,
        userId,
        meta: (meta as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });

    if (type === "LOGIN" && userId) {
      await db.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });
    }
  } catch (error) {
    console.warn(`[activity] Échec non bloquant de recordActivity(${type}):`, error);
  }
}
