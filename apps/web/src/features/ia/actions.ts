"use server";

import {
  CURRENT_ACADEMIC_YEAR,
  PAYMENT_STATUSES,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
} from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/lib/session";
import {
  askFaqChatbot,
  fetchAffluenceAndStaffing,
  fetchStaffingForecast,
  type ChatbotResponse,
} from "@/features/ia/services/ia-client";
import { triggerAnomalyAnalysis } from "@/features/ia/trigger-anomaly-analysis";
import { prisma } from "@/lib/prisma";

export interface IaActionResult {
  ok: boolean;
  message: string;
}

const LOCAL_FAQ_FALLBACK: { keywords: string[]; topic: string; answer: string }[] = [
  {
    keywords: ["frais", "combien", "25000", "25 000", "montant", "payer", "recu", "reçu"],
    topic: "Suivi financier",
    answer:
      "Les frais d'inscription s'élèvent à 25 000 FCFA (Orange Money, Wave, Free Money, Wizall ou carte) dans « Paiement ».",
  },
  {
    keywords: ["document", "piece", "pièce", "diplome", "diplôme", "releve", "relevé", "photo"],
    topic: "Pièces requises",
    answer:
      "Déposez 4 pièces dans « Documents » (PDF/JPG/PNG/WEBP, max 5 Mo) : pièce d'identité, relevé de notes, diplôme/attestation et photo d'identité.",
  },
  {
    keywords: ["rdv", "rendez-vous", "creneau", "créneau", "deposer", "déposer", "ufr", "ou ", "où "],
    topic: "Orientation",
    answer:
      "Votre dossier se dépose en ligne par UFR (ST, SEG, LSH, SJP). Pour la validation physique, réservez un créneau dans « Rendez-vous ».",
  },
  {
    keywords: ["bloque", "bloqué", "rejet", "refus", "probleme", "problème"],
    topic: "Blocage",
    answer:
      "Vérifiez dans « Documents » si une pièce a été rejetée ou dans « Paiement » si la transaction a échoué.",
  },
];

/** Génère et enregistre en base les prévisions AFFLUENCE_JOUR, AFFLUENCE_HEURE et BESOIN_AGENTS. */
export async function generateIaPredictionsAction(): Promise<IaActionResult> {
  await requireRole([ROLES.ADMIN]);

  const [affluence, staffing, ufrs] = await Promise.all([
    fetchAffluenceAndStaffing(7),
    fetchStaffingForecast(7, 25),
    prisma.uFR.findMany({ select: { id: true, code: true } }),
  ]);

  if (!affluence || !staffing) {
    return {
      ok: false,
      message: "Service IA indisponible, réessayez.",
    };
  }

  const ufrByCode = new Map(ufrs.map((u) => [u.code, u.id]));

  const now = new Date();
  const predictionsData = [
    ...affluence.forecasts.map((item) => ({
      type: "AFFLUENCE_JOUR",
      dateCible: new Date(`${item.date}T00:00:00.000Z`),
      valeur: item.predicted_registrations,
    })),
    ...affluence.hourly_forecasts.map((hourItem) => ({
      type: "AFFLUENCE_HEURE",
      dateCible: new Date(`${hourItem.date}T00:00:00.000Z`),
      heure: hourItem.heure,
      valeur: hourItem.predicted_registrations,
    })),
    ...staffing.ufr_staffing.map((ufrItem) => ({
      type: "BESOIN_AGENTS",
      dateCible: now,
      ufrId: ufrByCode.get(ufrItem.ufr_code) ?? null,
      valeur: ufrItem.recommended_agents_per_day,
    })),
  ];

  await prisma.prediction.createMany({ data: predictionsData });

  revalidatePath("/admin/statistiques");
  return {
    ok: true,
    message: `Prévisions IA générées (${affluence.forecasts.length} jours, granularité horaire et par UFR).`,
  };
}

/** Analyse les inscriptions récentes et met à jour aiClass / FraudAlert (ADMIN). */
export async function runIaAnomalyScanAction(): Promise<IaActionResult> {
  await requireRole([ROLES.ADMIN]);

  const probe = await fetchAffluenceAndStaffing(1);
  if (!probe) {
    return {
      ok: false,
      message: "Service IA indisponible, réessayez.",
    };
  }

  const registrations = await prisma.registration.findMany({
    select: { id: true },
    take: 30,
    orderBy: { createdAt: "desc" },
  });

  for (const reg of registrations) {
    await triggerAnomalyAnalysis(reg.id);
  }

  revalidatePath("/admin/alertes-fraude");
  revalidatePath("/admin/dossiers");
  revalidatePath("/admin");

  return {
    ok: true,
    message: `Analyse IA terminée sur ${registrations.length} dossier(s).`,
  };
}

/** Interroge le chatbot FAQ avec contexte réel côté serveur pour les questions de suivi. */
export async function askFaqChatbotAction(question: string): Promise<ChatbotResponse> {
  const user = await requireRole([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);
  const lower = question.toLowerCase();

  // Questions personnalisées basées sur l'état réel de l'étudiant connecté (côté serveur)
  if (
    user.role === ROLES.STUDENT &&
    (lower.includes("mon paiement") ||
      lower.includes("paiement est-il") ||
      lower.includes("payé") ||
      lower.includes("mon inscription") ||
      lower.includes("bloquée") ||
      lower.includes("statut"))
  ) {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      include: {
        registrations: {
          where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
          include: {
            payments: { orderBy: { createdAt: "desc" } },
            documents: true,
          },
          take: 1,
        },
      },
    });

    const reg = student?.registrations[0];
    if (!student || !reg) {
      return {
        answer:
          "Votre profil académique n'est pas encore complété. Rendez-vous dans « Mon dossier » pour démarrer votre inscription.",
        topic: "Statut personnel",
        confidence: 1,
      };
    }

    const paid = reg.payments.find((p) => p.statut === PAYMENT_STATUSES.SUCCESS);
    const rejectedDoc = reg.documents.find((d) => d.verificationStatus === "REJECTED");

    if (lower.includes("paiement")) {
      return {
        answer: paid
          ? `Oui, votre paiement de 25 000 FCFA est validé (reçu ${paid.receiptNumber ?? paid.providerRef}).`
          : "Votre paiement n'est pas encore confirmé. Ouvrez l'onglet « Paiement » pour régler les 25 000 FCFA.",
        topic: "Suivi financier personnel",
        confidence: 1,
      };
    }

    if (rejectedDoc) {
      return {
        answer: `Votre dossier nécessite une correction : un document a été rejeté (${rejectedDoc.motif ?? "voir l'onglet Documents"}).`,
        topic: "Blocage détecté",
        confidence: 1,
      };
    }

    const label = REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus];
    return {
      answer: `Statut actuel de votre dossier : ${label}. ${
        reg.statut === REGISTRATION_STATUSES.DRAFT ||
        reg.statut === REGISTRATION_STATUSES.PENDING_PAYMENT
          ? "Prochaine étape : réglez vos frais dans « Paiement »."
          : reg.documents.length < 4
            ? `Il vous reste ${4 - reg.documents.length} pièce(s) à déposer dans « Documents ».`
            : "Votre dossier suit son cours normal."
      }`,
      topic: "Statut personnel",
      confidence: 1,
    };
  }

  const remote = await askFaqChatbot(question);
  if (remote) {
    return remote;
  }

  const matched = LOCAL_FAQ_FALLBACK.find((item) =>
    item.keywords.some((kw) => lower.includes(kw))
  );

  if (matched) {
    return {
      answer: matched.answer,
      topic: matched.topic,
      confidence: 0.75,
    };
  }

  return {
    answer:
      "Je peux vous renseigner sur l'inscription, les pièces requises, l'orientation (où déposer le dossier), le suivi financier (25 000 FCFA) ou un blocage.",
    topic: "Aide générale",
    confidence: 0.5,
  };
}
