"use server";

import { ROLES, type Role } from "@smartinscription/shared";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/features/auth/lib/session";
import { prisma } from "@/lib/prisma";

const roleSchema = z.enum([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);

/** Marque une alerte fraude comme résolue (ADMIN uniquement). */
export async function resolveFraudAlertAction(formData: FormData): Promise<void> {
  await requireRole([ROLES.ADMIN]);
  const alertId = String(formData.get("alertId") ?? "");

  if (!alertId) return;

  await prisma.fraudAlert.update({
    where: { id: alertId },
    data: { resolu: true },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/alertes-fraude");
}

/** Met à jour le rôle d'un utilisateur (ADMIN uniquement). */
export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const currentAdmin = await requireRole([ROLES.ADMIN]);
  const targetUserId = String(formData.get("userId") ?? "");
  const parsedRole = roleSchema.safeParse(formData.get("role"));

  if (!targetUserId || !parsedRole.success) return;
  // Empêche un admin de rétrograder son propre compte par erreur
  if (targetUserId === currentAdmin.id) return;

  const newRole: Role = parsedRole.data;

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  // Synchronise aussi les métadonnées Supabase Auth si la clé service role est disponible
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await supabaseAdmin.auth.admin
      .updateUserById(targetUserId, {
        app_metadata: { role: newRole },
      })
      .catch(() => null);
  }

  revalidatePath("/admin");
}
