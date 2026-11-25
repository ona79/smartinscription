"use server";

import { NOTIFICATION_TYPES, ROLES } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/lib/session";
import { notifyUser } from "@/features/notifications/services/notification-service";
import { buildNotificationEmail } from "@/features/notifications/services/email-template";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

/** Action ADMIN : incrémente `cardQrVersion` pour révoquer et régénérer le QR de la carte. */
export async function regenerateCardQrAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireRole([ROLES.ADMIN]);
  const studentId = String(formData.get("studentId") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");

  if (!studentId) {
    return actionError(MESSAGES.generic.notFound);
  }

  try {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { cardQrVersion: { increment: 1 } },
      select: {
        user: { select: { id: true, email: true, prenom: true } },
      },
    });

    const emailContent = buildNotificationEmail({
      prenom: updated.user.prenom,
      title: "Code QR de votre carte étudiante renouvelé",
      bodyHtml:
        "<p>Le code QR d'identité de votre carte étudiante numérique a été renouvelé par l'administration. L'ancien code n'est plus valide.</p>",
      bodyText:
        "Le code QR d'identité de votre carte étudiante numérique a été renouvelé par l'administration.",
      ctaLabel: "Voir ma carte",
      ctaHref: "/etudiant/dossier",
    });

    await notifyUser({
      userId: updated.user.id,
      email: updated.user.email,
      type: NOTIFICATION_TYPES.REMINDER,
      message: "Le code QR de votre carte étudiante numérique a été régénéré.",
      emailSubject: "Renouvellement du QR code de votre carte étudiante",
      emailHtml: emailContent.html,
      emailText: emailContent.text,
    });

    revalidatePath("/etudiant/dossier");
    if (registrationId) revalidatePath(`/agent/dossiers/${registrationId}`);
    return actionOk("Code QR de la carte régénéré.");
  } catch (error) {
    return toActionError(error, "carteQr.regenerate");
  }
}
