"use server";

import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUSES,
  ROLES,
} from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/lib/session";
import { completeProfileSchema } from "@/features/dossier/schemas";
import { prisma } from "@/lib/prisma";

export interface ProfileActionState {
  error?: string;
}

/**
 * Complète le profil académique de l'étudiant et crée son dossier d'inscription
 * au statut DRAFT pour l'année académique courante.
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
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Les informations saisies sont invalides.",
    };
  }

  const { numeroEtudiant, ufrId, filiereId, niveau } = parsed.data;
  const normalizedNumero = numeroEtudiant.toUpperCase();

  // Vérifie côté serveur que la filière appartient bien à l'UFR sélectionnée
  const filiere = await prisma.filiere.findFirst({
    where: { id: filiereId, ufrId },
  });

  if (!filiere) {
    return { error: "La filière sélectionnée ne correspond pas à l'UFR choisie." };
  }

  const existingStudent = await prisma.student.findUnique({
    where: { userId: user.id },
  });

  if (existingStudent) {
    redirect("/etudiant");
  }

  const duplicateNumero = await prisma.student.findUnique({
    where: { numeroEtudiant: normalizedNumero },
  });

  if (duplicateNumero) {
    return {
      error: "Ce numéro étudiant est déjà associé à un autre compte.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        userId: user.id,
        numeroEtudiant: normalizedNumero,
        ufrId,
        filiereId,
        niveau,
      },
    });

    await tx.registration.create({
      data: {
        studentId: student.id,
        anneeAcademique: CURRENT_ACADEMIC_YEAR,
        statut: REGISTRATION_STATUSES.DRAFT,
      },
    });
  });

  revalidatePath("/etudiant");
  revalidatePath("/etudiant/dossier");
  redirect("/etudiant");
}
