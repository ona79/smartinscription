import {
  APPOINTMENT_STATUSES,
  CURRENT_ACADEMIC_YEAR,
  PAYMENT_STATUSES,
  REGISTRATION_STATUSES,
  type RegistrationStatus,
} from "@smartinscription/shared";
import type { AiClassification, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Calcule la file active du jour (dossiers payés non validés + RDV du jour). */
export function computeActiveQueueCount(
  paidNotValidatedCount: number,
  todayAppointmentsCount: number
): number {
  return paidNotValidatedCount + todayAppointmentsCount;
}

/** Construit la clause WHERE Prisma pour la recherche et le filtrage des dossiers. */
export function buildDossiersWhereClause(filters: {
  statut?: string;
  ufrId?: string;
  aiClass?: string;
  q?: string;
}): Prisma.RegistrationWhereInput {
  const where: Prisma.RegistrationWhereInput = {
    anneeAcademique: CURRENT_ACADEMIC_YEAR,
  };

  if (
    filters.statut &&
    Object.values(REGISTRATION_STATUSES).includes(filters.statut as RegistrationStatus)
  ) {
    where.statut = filters.statut as RegistrationStatus;
  }

  if (
    filters.aiClass &&
    (["CONFORME", "A_VERIFIER", "SUSPECT"] as const).includes(
      filters.aiClass as AiClassification
    )
  ) {
    where.aiClass = filters.aiClass as AiClassification;
  }

  const studentFilter: Prisma.StudentWhereInput = {};
  if (filters.ufrId) {
    studentFilter.ufrId = filters.ufrId;
  }
  if (filters.q && filters.q.trim().length > 0) {
    const query = filters.q.trim();
    studentFilter.OR = [
      { numeroEtudiant: { contains: query, mode: "insensitive" } },
      { user: { nom: { contains: query, mode: "insensitive" } } },
      { user: { prenom: { contains: query, mode: "insensitive" } } },
    ];
  }

  if (Object.keys(studentFilter).length > 0) {
    where.student = studentFilter;
  }

  return where;
}

/** Récupère les métriques globales et la file active du jour pour /admin. */
export async function getAdminDashboardMetrics() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    totalStudents,
    paidSummary,
    paidNotValidatedCount,
    todayAppointmentsCount,
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
        statut: {
          in: [
            REGISTRATION_STATUSES.PAID,
            REGISTRATION_STATUSES.DOCS_INCOMPLETE,
            REGISTRATION_STATUSES.DOCS_COMPLETE,
          ],
        },
      },
    }),
    prisma.appointment.count({
      where: {
        statut: APPOINTMENT_STATUSES.SCHEDULED,
        debut: { gte: startOfDay, lte: endOfDay },
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
      take: 8,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
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
    activeQueueCount: computeActiveQueueCount(
      paidNotValidatedCount,
      todayAppointmentsCount
    ),
    paidNotValidatedCount,
    todayAppointmentsCount,
    unresolvedFraudCount,
    recentRegistrations,
    users,
  };
}

/** Récupère les statistiques détaillées + séries temporelles pour Recharts. */
export async function getAdminStatistics() {
  const [ufrs, paymentsByMethod, predictions, registrations] = await Promise.all([
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
      orderBy: [{ dateCible: "asc" }, { heure: "asc" }],
      take: 60,
    }),
    prisma.registration.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  ]);

  const dailyCounts = new Map<string, number>();
  for (const reg of registrations) {
    const key = reg.createdAt.toISOString().slice(0, 10);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }
  const registrationsByDay = Array.from(dailyCounts.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return { ufrs, paymentsByMethod, predictions, registrationsByDay };
}

/** Récupère les dossiers filtrés et paginés pour /admin/dossiers. */
export async function getAdminDossiers(params: {
  statut?: string;
  ufrId?: string;
  aiClass?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 10;
  const where = buildDossiersWhereClause(params);

  const [items, total, ufrs] = await Promise.all([
    prisma.registration.findMany({
      where,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.registration.count({ where }),
    prisma.uFR.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    ufrs,
  };
}

/** Récupère les alertes fraude avec tri par score et filtre par type. */
export async function getAdminFraudAlerts(params?: {
  type?: string;
  sort?: string;
}) {
  const where: Prisma.FraudAlertWhereInput = {};
  if (params?.type) {
    where.type = params.type;
  }

  const orderBy: Prisma.FraudAlertOrderByWithRelationInput[] =
    params?.sort === "score_desc"
      ? [{ score: "desc" }, { createdAt: "desc" }]
      : params?.sort === "score_asc"
        ? [{ score: "asc" }, { createdAt: "desc" }]
        : [{ resolu: "asc" }, { createdAt: "desc" }];

  const [alerts, typesRaw] = await Promise.all([
    prisma.fraudAlert.findMany({
      where,
      orderBy,
      include: {
        payment: true,
        registration: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
      take: 50,
    }),
    prisma.fraudAlert.findMany({
      distinct: ["type"],
      select: { type: true },
    }),
  ]);

  return {
    alerts,
    types: typesRaw.map((t) => t.type),
  };
}
