"use server";

import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUSES,
  ROLES,
} from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/features/auth/lib/session";
import {
  completeProfileSchema,
  updateBirthInfoSchema,
} from "@/features/dossier/schemas";
import { updateRegistrationBuStatus } from "@/features/dossier/services/bu-service";
import {
  actionError,
  actionOk,
  actionValidationError,
  type ActionResult,
} from "@/lib/action-result";
import { toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export type ProfileActionState = ActionResult<{ registrationId?: string }>;

/**
 * Complète le profil académique + état civil de l'étudiant et crée son dossier
 * d'inscription au statut DRAFT pour l'année académique courante.
 */
export async function completeStudentProfileAction(
  _prevState: ProfileActionState | null,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = completeProfileSchema.safeParse({
    numeroEtudiant: formData.get("numeroEtudiant"),
    ufrId: formData.get("ufrId"),
    filiereId: formData.get("filiereId"),
    niveau: formData.get("niveau"),
    birthDate: formData.get("birthDate"),
    birthPlace: formData.get("birthPlace"),
    nationality: formData.get("nationality"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  const {
    numeroEtudiant,
    ufrId,
    filiereId,
    niveau,
    birthDate,
    birthPlace,
    nationality,
  } = parsed.data;
  const normalizedNumero = numeroEtudiant.toUpperCase();

  try {
    const filiere = await prisma.filiere.findFirst({
      where: { id: filiereId, ufrId },
    });

    if (!filiere) {
      return actionError(MESSAGES.dossier.filiereMismatch, {
        filiereId: MESSAGES.dossier.filiereMismatch,
      });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        registrations: {
          where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (existingStudent) {
      return actionOk(MESSAGES.dossier.alreadyExists, {
        registrationId: existingStudent.registrations[0]?.id,
      });
    }

    const duplicateNumero = await prisma.student.findUnique({
      where: { numeroEtudiant: normalizedNumero },
      select: { id: true },
    });

    if (duplicateNumero) {
      return actionError("Ce numéro étudiant est déjà associé à un autre compte.", {
        numeroEtudiant: "Ce numéro étudiant est déjà associé à un autre compte.",
      });
    }

    let createdRegistrationId = "";
    await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          userId: user.id,
          numeroEtudiant: normalizedNumero,
          ufrId,
          filiereId,
          niveau,
          birthDate: new Date(`${birthDate}T00:00:00.000Z`),
          birthPlace,
          nationality,
        },
      });

      const reg = await tx.registration.create({
        data: {
          studentId: student.id,
          anneeAcademique: CURRENT_ACADEMIC_YEAR,
          niveau,
          statut: REGISTRATION_STATUSES.DRAFT,
        },
        select: { id: true },
      });
      createdRegistrationId = reg.id;
    });

    revalidatePath("/etudiant");
    revalidatePath("/etudiant/dossier");
    return actionOk(MESSAGES.dossier.profileSuccess, {
      registrationId: createdRegistrationId,
    });
  } catch (error) {
    return toActionError(error, "dossier.completeProfile");
  }
}

/**
 * Met à jour les informations de naissance/nationalité depuis « Mon dossier »
 * tant que l'inscription n'est pas VALIDATED.
 */
export async function updateStudentBirthInfoAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = updateBirthInfoSchema.safeParse({
    birthDate: formData.get("birthDate"),
    birthPlace: formData.get("birthPlace"),
    nationality: formData.get("nationality"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        registrations: {
          where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
          select: { id: true, statut: true },
          take: 1,
        },
      },
    });

    if (!student) {
      return actionError(MESSAGES.dossier.profileNotFound);
    }

    const reg = student.registrations[0];
    if (reg?.statut === REGISTRATION_STATUSES.VALIDATED) {
      return actionError(MESSAGES.dossier.birthInfoLocked);
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        birthDate: new Date(`${parsed.data.birthDate}T00:00:00.000Z`),
        birthPlace: parsed.data.birthPlace,
        nationality: parsed.data.nationality,
      },
    });

    revalidatePath("/etudiant");
    revalidatePath("/etudiant/dossier");
    if (reg) {
      revalidatePath(`/agent/dossiers/${reg.id}`);
    }

    return actionOk(MESSAGES.dossier.birthInfoSuccess);
  } catch (error) {
    return toActionError(error, "dossier.updateBirthInfo");
  }
}

const buStatusSchema = z.object({
  registrationId: z.string().trim().min(1),
  status: z.enum(["NONE", "ACTIVE"]),
});

/** Action agent/admin : active ou désactive l'accès BU d'une inscription payée. */
export async function setBuStatusAction(
  registrationId: string,
  status: "NONE" | "ACTIVE"
): Promise<ActionResult> {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);
  const parsed = buStatusSchema.safeParse({ registrationId, status });
  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  try {
    await updateRegistrationBuStatus({
      registrationId: parsed.data.registrationId,
      status: parsed.data.status,
      actorId: user.id,
      actorRole: user.role,
    });
    revalidatePath("/etudiant");
    revalidatePath("/etudiant/dossier");
    revalidatePath(`/agent/dossiers/${parsed.data.registrationId}`);
    return actionOk(
      parsed.data.status === "ACTIVE"
        ? MESSAGES.bu.activated
        : MESSAGES.bu.deactivated
    );
  } catch (error) {
    return toActionError(error, "dossier.setBuStatus");
  }
}
