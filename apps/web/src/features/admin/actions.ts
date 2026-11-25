"use server";

import { ROLES, type Role } from "@smartinscription/shared";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/features/auth/lib/session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

const roleSchema = z.enum([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);

/** Marque une alerte fraude comme résolue (ADMIN uniquement). */
export async function resolveFraudAlertAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireRole([ROLES.ADMIN]);
  const alertId = String(formData.get("alertId") ?? "");

  if (!alertId) return actionError(MESSAGES.generic.notFound);

  try {
    await prisma.fraudAlert.update({
      where: { id: alertId },
      data: { resolu: true },
    });
  } catch (error) {
    return toActionError(error, "admin.resolveFraudAlert");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/alertes-fraude");
  return actionOk(MESSAGES.admin.saved);
}

/** Met à jour le rôle d'un utilisateur (ADMIN uniquement). */
export async function updateUserRoleAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const currentAdmin = await requireRole([ROLES.ADMIN]);
  const targetUserId = String(formData.get("userId") ?? "");
  const parsedRole = roleSchema.safeParse(formData.get("role"));

  if (!targetUserId || !parsedRole.success) {
    return actionError(MESSAGES.generic.formInvalid);
  }
  if (targetUserId === currentAdmin.id) {
    return actionError(MESSAGES.generic.forbidden);
  }

  const newRole: Role = parsedRole.data;

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

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
  } catch (error) {
    return toActionError(error, "admin.updateUserRole");
  }

  revalidatePath("/admin");
  return actionOk(MESSAGES.admin.saved);
}
