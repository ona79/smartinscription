"use server";

import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUSES,
  ROLES,
} from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/lib/session";
import {
  completeProfileSchema,
  updateBirthInfoSchema,
} from "@/features/dossier/schemas";
import { prisma } from "@/lib/prisma";

export interface ProfileActionState {
  ok?: boolean;
  error?: string;
  success?: string;
  registrationId?: string;
}

/**
 * Complète le profil académique + état civil de l'étudiant et crée son dossier
 * d'inscription au statut DRAFT pour l'année académique courante.
 */
export async function completeStudentProfileAction(
  _prevState: ProfileActionState,
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
    return {
      error: parsed.error.issues[0]?.message ?? "Les informations saisies sont invalides.",
    };
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

  const filiere = await prisma.filiere.findFirst({
    where: { id: filiereId, ufrId },
  });

  if (!filiere) {
    return { error: "La filière sélectionnée ne correspond pas à l'UFR choisie." };
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
    return {
      ok: true,
      registrationId: existingStudent.registrations[0]?.id,
    };
  }

  const duplicateNumero = await prisma.student.findUnique({
    where: { numeroEtudiant: normalizedNumero },
    select: { id: true },
  });

  if (duplicateNumero) {
    return {
      error: "Ce numéro étudiant est déjà associé à un autre compte.",
    };
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
        statut: REGISTRATION_STATUSES.DRAFT,
      },
      select: { id: true },
    });
    createdRegistrationId = reg.id;
  });

  revalidatePath("/etudiant");
  revalidatePath("/etudiant/dossier");
  return {
    ok: true,
    registrationId: createdRegistrationId,
    success: "Dossier enregistré.",
  };
}

/**
 * Met à jour les informations de naissance/nationalité depuis « Mon dossier »
 * tant que l'inscription n'est pas VALIDATED.
 */
export async function updateStudentBirthInfoAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await requireRole([ROLES.STUDENT]);

  const parsed = updateBirthInfoSchema.safeParse({
    birthDate: formData.get("birthDate"),
    birthPlace: formData.get("birthPlace"),
    nationality: formData.get("nationality"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Informations invalides.",
    };
  }

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
    return { error: "Profil étudiant introuvable." };
  }

  const reg = student.registrations[0];
  if (reg?.statut === REGISTRATION_STATUSES.VALIDATED) {
    return {
      error: "Dossier déjà validé : modification des informations bloquée.",
    };
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

  return { ok: true, success: "Informations de naissance mises à jour." };
}
