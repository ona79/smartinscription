"use server";

import { ROLES } from "@smartinscription/shared";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/lib/session";
import {
  analyzeDossierAnomaly,
  askFaqChatbot,
  fetchAffluenceAndStaffing,
  type ChatbotResponse,
} from "@/features/ia/services/ia-client";
import { prisma } from "@/lib/prisma";

const LOCAL_FAQ_FALLBACK: { keywords: string[]; topic: string; answer: string }[] = [
  {
    keywords: ["frais", "combien", "25000", "25 000", "montant", "payer"],
    topic: "Frais d'inscription",
    answer:
      "Les frais d'inscription s'élèvent à 25 000 FCFA. Vous pouvez payer via Wave, Orange Money, Free Money, Wizall ou carte bancaire dans l'onglet « Paiement ».",
  },
  {
    keywords: ["document", "piece", "pièce", "diplome", "diplôme", "releve", "relevé", "photo"],
    topic: "Pièces justificatives",
    answer:
      "Déposez 4 pièces dans « Documents » (PDF/JPG/PNG/WEBP, max 5 Mo) : pièce d'identité, relevé de notes, diplôme/attestation et photo d'identité.",
  },
  {
    keywords: ["rdv", "rendez-vous", "creneau", "créneau"],
    topic: "Rendez-vous",
    answer:
      "Après le paiement, choisissez un créneau de 30 minutes dans l'onglet « Rendez-vous » et présentez-vous avec votre QR code.",
  },
];

/** Génère et enregistre en base les prévisions IA d'affluence et de personnel (ADMIN). */
export async function generateIaPredictionsAction(): Promise<void> {
  await requireRole([ROLES.ADMIN]);

  const result = await fetchAffluenceAndStaffing(7);
  if (!result) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of result.forecasts) {
      const targetDate = new Date(`${item.date}T09:00:00.000Z`);
      await tx.prediction.create({
        data: {
          type: "AFFLUENCE_DOSSIERS",
          dateCible: targetDate,
          valeur: item.predicted_registrations,
        },
      });
      await tx.prediction.create({
        data: {
          type: "BESOIN_AGENTS",
          dateCible: targetDate,
          valeur: item.recommended_agents,
        },
      });
    }
  });

  revalidatePath("/admin/statistiques");
}

/** Analyse les inscriptions récentes avec le modèle d'anomalies IA (ADMIN). */
export async function runIaAnomalyScanAction(): Promise<void> {
  await requireRole([ROLES.ADMIN]);

  const registrations = await prisma.registration.findMany({
    include: {
      payments: true,
      _count: { select: { documents: true } },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
  });

  for (const reg of registrations) {
    const latestPayment = reg.payments[0];
    const amount = latestPayment?.montant ?? 25000;
    const attempts = Math.max(1, reg.payments.length);
    const hour = (latestPayment?.createdAt ?? reg.createdAt).getHours();
    const docsCount = reg._count.documents;

    const analysis = await analyzeDossierAnomaly({
      amount_fcfa: amount,
      payment_attempts: attempts,
      hour_of_day: hour,
      docs_count: docsCount,
    });

    if (analysis?.is_anomaly) {
      const existingAlert = await prisma.fraudAlert.findFirst({
        where: { registrationId: reg.id, resolu: false },
      });
      if (!existingAlert) {
        await prisma.fraudAlert.create({
          data: {
            registrationId: reg.id,
            paymentId: latestPayment?.id ?? null,
            type: `IA_${analysis.classification}`,
            score: analysis.anomaly_score,
            resolu: false,
          },
        });
      }
    }
  }

  revalidatePath("/admin/alertes-fraude");
  revalidatePath("/admin");
}

/** Interroge le chatbot FAQ (service FastAPI avec repli local). */
export async function askFaqChatbotAction(question: string): Promise<ChatbotResponse> {
  await requireRole([ROLES.STUDENT, ROLES.AGENT, ROLES.ADMIN]);

  const remote = await askFaqChatbot(question);
  if (remote) {
    return remote;
  }

  const lower = question.toLowerCase();
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
      "Posez votre question sur les frais (25 000 FCFA), les moyens de paiement, les pièces justificatives ou les rendez-vous.",
    topic: "Aide générale",
    confidence: 0.5,
  };
}
