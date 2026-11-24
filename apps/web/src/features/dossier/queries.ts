import { CURRENT_ACADEMIC_YEAR } from "@smartinscription/shared";
import { prisma } from "@/lib/prisma";

export interface UfrWithFilieres {
  id: string;
  nom: string;
  code: string;
  filieres: {
    id: string;
    nom: string;
    ufrId: string;
  }[];
}

/** Récupère toutes les UFR avec leurs filières triées par ordre alphabétique. */
export async function getUfrsWithFilieres(): Promise<UfrWithFilieres[]> {
  return prisma.uFR.findMany({
    orderBy: { nom: "asc" },
    include: {
      filieres: {
        orderBy: { nom: "asc" },
      },
    },
  });
}

/** Récupère le profil étudiant et l'inscription de l'année académique courante. */
export async function getStudentDashboardData(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      ufr: true,
      filiere: true,
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        include: {
          payments: {
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: { documents: true },
          },
        },
        take: 1,
      },
    },
  });

  return {
    student,
    registration: student?.registrations[0] ?? null,
  };
}
