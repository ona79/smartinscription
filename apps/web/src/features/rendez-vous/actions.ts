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

export interface AppointmentActionState {
  error?: string;
}

const bookSchema = z.object({
  startIso: z.string().datetime("Créneau horaire invalide."),
});

/** Action étudiant : réserve un créneau de rendez-vous. */
export async function bookAppointmentAction(
  _prevState: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = bookSchema.safeParse({
    startIso: formData.get("startIso"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Créneau invalide." };
  }

  try {
    await bookStudentAppointment({
      userId: user.id,
      startIso: parsed.data.startIso,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Impossible de réserver ce créneau.",
    };
  }

  revalidatePath("/etudiant/rendez-vous");
  revalidatePath("/etudiant");
  revalidatePath("/agent");
  return {};
}

/** Action étudiant : annule son rendez-vous en cours. */
export async function cancelAppointmentAction(formData: FormData): Promise<void> {
  const user = await requireRole([ROLES.STUDENT]);
  const appointmentId = String(formData.get("appointmentId") ?? "");

  if (appointmentId) {
    await cancelStudentAppointment({ userId: user.id, appointmentId });
  }

  revalidatePath("/etudiant/rendez-vous");
  revalidatePath("/agent");
}

/** Action agent/admin : marque un rendez-vous effectué ou absent. */
export async function updateAppointmentStatusAction(formData: FormData): Promise<void> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const status = formData.get("status") === "COMPLETED" ? "COMPLETED" : "NO_SHOW";

  if (appointmentId) {
    await updateAppointmentStatus({
      appointmentId,
      status,
      reviewerRole: user.role,
    });
  }

  revalidatePath("/agent");
}
