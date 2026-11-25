import { PAYMENT_STATUSES } from "@smartinscription/shared";
import { analyzeDossierAnomaly } from "@/features/ia/services/ia-client";
import { prisma } from "@/lib/prisma";

const NUMERO_ETUDIANT_REGEX = /^[A-Z0-9-]{4,32}$/;

/** Évalue les règles métier déterministes d'anomalie sur un dossier. */
export function evaluateDossierRules(input: {
  successPaymentsCount: number;
  sameStudentRegistrationsCount: number;
  studentUfrId: string;
  filiereUfrId: string;
  numeroEtudiant: string;
}): string[] {
  const flags: string[] = [];

  if (input.successPaymentsCount > 1) {
    flags.push("Paiement en double détecté");
  }
  if (input.sameStudentRegistrationsCount > 1) {
    flags.push("Étudiant inscrit plusieurs fois pour la même année");
  }
  if (input.studentUfrId !== input.filiereUfrId) {
    flags.push("Incohérence entre l'UFR et la filière");
  }
  if (!NUMERO_ETUDIANT_REGEX.test(input.numeroEtudiant)) {
    flags.push("Format du numéro étudiant invalide");
  }

  return flags;
}

/**
 * Analyse un dossier d'inscription (règles métier + IsolationForest + ActivityLog),
 * met à jour aiClass/aiScore/aiAnalyzedAt sur Registration et crée une FraudAlert si SUSPECT.
 * Ne bloque jamais l'appelant en cas d'échec.
 */
export async function triggerAnomalyAnalysis(
  registrationId: string,
  deps: { db?: typeof prisma; analyzer?: typeof analyzeDossierAnomaly } = {}
): Promise<void> {
  const db = deps.db ?? prisma;
  const analyzer = deps.analyzer ?? analyzeDossierAnomaly;

  try {
    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: {
        student: {
          include: {
            user: true,
            filiere: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!registration) return;

    const sameStudentRegistrationsCount = await db.registration.count({
      where: {
        studentId: registration.studentId,
        anneeAcademique: registration.anneeAcademique,
      },
    });

    const latestActivity = await db.activityLog.findFirst({
      where: { userId: registration.student.userId },
      orderBy: { createdAt: "desc" },
    });

    const successPaymentsCount = registration.payments.filter(
      (p) => p.statut === PAYMENT_STATUSES.SUCCESS
    ).length;

    const ruleFlags = evaluateDossierRules({
      successPaymentsCount,
      sameStudentRegistrationsCount,
      studentUfrId: registration.student.ufrId,
      filiereUfrId: registration.student.filiere.ufrId,
      numeroEtudiant: registration.student.numeroEtudiant,
    });

    const latestPayment = registration.payments[0];
    const loginHour =
      latestActivity?.createdAt.getHours() ??
      registration.student.user.lastLoginAt?.getHours() ??
      12;

    const remote = await analyzer({
      amount_fcfa: latestPayment?.montant ?? 25000,
      payment_attempts: Math.max(1, registration.payments.length),
      hour_of_day: (latestPayment?.createdAt ?? registration.createdAt).getHours(),
      docs_count: registration._count.documents,
      login_hour: loginHour,
      rule_flags: ruleFlags,
    });

    const fallbackScore = ruleFlags.length > 0 ? Math.min(1, 0.45 * ruleFlags.length) : 0.05;
    const aiScore = remote?.anomaly_score ?? fallbackScore;
    const aiClass =
      remote?.classification ??
      (aiScore >= 0.7 ? "SUSPECT" : aiScore >= 0.4 ? "A_VERIFIER" : "CONFORME");

    await db.registration.update({
      where: { id: registration.id },
      data: {
        aiClass,
        aiScore,
        aiAnalyzedAt: new Date(),
      },
    });

    if (aiClass === "SUSPECT") {
      const existingOpen = await db.fraudAlert.findFirst({
        where: { registrationId: registration.id, resolu: false },
      });
      if (!existingOpen) {
        await db.fraudAlert.create({
          data: {
            registrationId: registration.id,
            paymentId: latestPayment?.id ?? null,
            type: ruleFlags[0] ? `IA_${ruleFlags[0].slice(0, 32)}` : "IA_SUSPECT",
            score: aiScore,
            resolu: false,
          },
        });
      }
    }
  } catch (error) {
    console.warn(`[ia:hook] Échec non bloquant sur registrationId=${registrationId}:`, error);
  }
}
