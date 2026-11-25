"use server";

import { ROLES } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/features/auth/lib/session";
import {
  bookStudentAppointment,
  cancelStudentAppointment,
  updateAppointmentStatus,
} from "@/features/rendez-vous/services/appointment-service";
import {
  actionOk,
  actionValidationError,
  type ActionResult,
} from "@/lib/action-result";
import { AppError, toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";

export type AppointmentActionState = ActionResult;

const bookSchema = z.object({
  startIso: z.string().datetime(MESSAGES.appointment.slotInvalid),
});

/** Action étudiant : réserve un créneau de rendez-vous. */
export async function bookAppointmentAction(
  _prevState: AppointmentActionState | null,
  formData: FormData
): Promise<AppointmentActionState> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = bookSchema.safeParse({
    startIso: formData.get("startIso"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  try {
    await bookStudentAppointment({
      userId: user.id,
      startIso: parsed.data.startIso,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/déjà réservé|complet|pris|unique|P2002/i.test(message)) {
      return toActionError(
        new AppError(MESSAGES.appointment.slotTaken),
        "appointment.book"
      );
    }
    if (/déjà un rendez-vous/i.test(message)) {
      return toActionError(
        new AppError(MESSAGES.appointment.alreadyBooked),
        "appointment.book"
      );
    }
    return toActionError(error, "appointment.book");
  }

  revalidatePath("/etudiant/rendez-vous");
  revalidatePath("/etudiant");
  revalidatePath("/agent");
  return actionOk(MESSAGES.appointment.booked);
}

/** Action étudiant : annule son rendez-vous en cours. */
export async function cancelAppointmentAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole([ROLES.STUDENT]);
  const appointmentId = String(formData.get("appointmentId") ?? "");

  try {
    if (appointmentId) {
      await cancelStudentAppointment({ userId: user.id, appointmentId });
    }
  } catch (error) {
    return toActionError(error, "appointment.cancel");
  }

  revalidatePath("/etudiant/rendez-vous");
  revalidatePath("/etudiant");
  revalidatePath("/agent");
  return actionOk(MESSAGES.appointment.cancelled);
}

/** Action agent/admin : marque un rendez-vous effectué ou absent. */
export async function updateAppointmentStatusAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const status = formData.get("status") === "COMPLETED" ? "COMPLETED" : "NO_SHOW";

  try {
    if (appointmentId) {
      await updateAppointmentStatus({
        appointmentId,
        status,
        reviewerRole: user.role,
      });
    }
  } catch (error) {
    return toActionError(error, "appointment.updateStatus");
  }

  revalidatePath("/agent");
  return actionOk(MESSAGES.generic.saved);
}
