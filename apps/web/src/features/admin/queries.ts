import {
  CURRENT_ACADEMIC_YEAR,
  PAYMENT_STATUSES,
  REGISTRATION_STATUSES,
} from "@smartinscription/shared";
import { prisma } from "@/lib/prisma";

/** Récupère les métriques globales et les dernières inscriptions pour /admin. */
export async function getAdminDashboardMetrics() {
  const [
    totalStudents,
    paidSummary,
    validatedCount,
    unresolvedFraudCount,
    recentRegistrations,
    users,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.payment.aggregate({
      where: { statut: PAYMENT_STATUSES.SUCCESS },
      _count: { id: true },
      _sum: { montant: true },
    }),
    prisma.registration.count({
      where: {
        anneeAcademique: CURRENT_ACADEMIC_YEAR,
        statut: REGISTRATION_STATUSES.VALIDATED,
      },
    }),
    prisma.fraudAlert.count({
      where: { resolu: false },
    }),
    prisma.registration.findMany({
      where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
      include: {
        student: {
          include: { user: true, ufr: true, filiere: true },
        },
        payments: {
          where: { statut: PAYMENT_STATUSES.SUCCESS },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        role: true,
      },
    }),
  ]);

  return {
    totalStudents,
    paidCount: paidSummary._count.id,
    totalRevenueFcfa: paidSummary._sum.montant ?? 0,
    validatedCount,
    unresolvedFraudCount,
    recentRegistrations,
    users,
  };
}

/** Récupère les statistiques détaillées par UFR, moyen de paiement et prédictions IA. */
export async function getAdminStatistics() {
  const [ufrs, paymentsByMethod, predictions] = await Promise.all([
    prisma.uFR.findMany({
      orderBy: { nom: "asc" },
      include: {
        _count: { select: { students: true, filieres: true } },
      },
    }),
    prisma.payment.groupBy({
      by: ["moyen"],
      where: { statut: PAYMENT_STATUSES.SUCCESS },
      _count: { id: true },
      _sum: { montant: true },
    }),
    prisma.prediction.findMany({
      orderBy: { dateCible: "desc" },
      take: 10,
    }),
  ]);

  return { ufrs, paymentsByMethod, predictions };
}

/** Récupère les alertes fraude triées par état de résolution puis date. */
export async function getAdminFraudAlerts() {
  return prisma.fraudAlert.findMany({
    orderBy: [{ resolu: "asc" }, { createdAt: "desc" }],
    include: {
      payment: true,
      registration: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
    take: 50,
  });
}
