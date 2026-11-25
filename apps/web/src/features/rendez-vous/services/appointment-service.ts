import {
  APPOINTMENT_STATUSES,
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
  type Role,
} from "@smartinscription/shared";
import { notifyUser } from "@/features/notifications/services/notification-service";
import { prisma } from "@/lib/prisma";

const SLOT_DURATION_MINUTES = 30;
const SLOT_HOURS: [number, number][] = [
  [9, 0],
  [9, 30],
  [10, 0],
  [10, 30],
  [11, 0],
  [11, 30],
  [14, 30],
  [15, 0],
  [15, 30],
  [16, 0],
  [16, 30],
];

export function getSlotCapacity(): number {
  const parsed = Number(process.env.APPOINTMENT_SLOT_CAPACITY ?? "1");
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export interface AvailableSlot {
  startIso: string;
  endIso: string;
  dayLabel: string;
  timeLabel: string;
  loadScore: number;
  recommended: boolean;
}

export interface HourlyPredictionInput {
  dateCible: Date;
  heure: number | null;
  valeur: number;
}

/**
 * Génère les créneaux disponibles de 30 min sur les 5 prochains jours ouvrés.
 * Tient compte de la capacité par créneau et des prévisions IA horaires (sinon charge réelle).
 */
export function generateAvailableSlots(
  bookedStarts: Date[],
  now = new Date(),
  hourlyPredictions: HourlyPredictionInput[] = [],
  slotCapacity = getSlotCapacity()
): AvailableSlot[] {
  const bookedCounts = new Map<number, number>();
  for (const d of bookedStarts) {
    const ts = d.getTime();
    bookedCounts.set(ts, (bookedCounts.get(ts) ?? 0) + 1);
  }

  const predByDayHour = new Map<string, number>();
  for (const p of hourlyPredictions) {
    if (p.heure === null) continue;
    const key = `${p.dateCible.toISOString().slice(0, 10)}-${p.heure}`;
    predByDayHour.set(key, p.valeur);
  }

  const slots: AvailableSlot[] = [];
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  let businessDaysFound = 0;
  let dayOffset = 0;

  while (businessDaysFound < 5 && dayOffset < 14) {
    const candidateDay = new Date(cursor);
    candidateDay.setDate(cursor.getDate() + dayOffset);
    dayOffset += 1;

    const dayOfWeek = candidateDay.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    businessDaysFound += 1;
    const dayLabel = candidateDay.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    for (const [hour, minute] of SLOT_HOURS) {
      const start = new Date(candidateDay);
      start.setHours(hour, minute, 0, 0);
      if (start.getTime() <= now.getTime()) {
        continue;
      }

      const bookedCount = bookedCounts.get(start.getTime()) ?? 0;
      if (bookedCount >= slotCapacity) {
        continue;
      }

      const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000);
      const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const predKey = `${start.toISOString().slice(0, 10)}-${hour}`;
      const predictedLoad = predByDayHour.get(predKey);
      const loadScore =
        predictedLoad !== undefined ? predictedLoad + bookedCount : bookedCount;

      slots.push({
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        dayLabel,
        timeLabel,
        loadScore,
        recommended: false,
      });
    }
  }

  if (slots.length > 0) {
    const minLoad = Math.min(...slots.map((s) => s.loadScore));
    for (const s of slots) {
      if (s.loadScore === minLoad) {
        s.recommended = true;
      }
    }
  }

  return slots;
}

/** Retourne le créneau le moins chargé à venir (attribution intelligente). */
export function pickLeastLoadedSlot(slots: AvailableSlot[]): AvailableSlot | null {
  if (slots.length === 0) return null;
  return slots.reduce((best, cur) => (cur.loadScore < best.loadScore ? cur : best));
}

/** Réserve ou déplace un créneau de rendez-vous pour un étudiant ayant payé. */
export async function bookStudentAppointment(params: {
  userId: string;
  startIso: string;
  replaceExisting?: boolean;
}) {
  const start = new Date(params.startIso);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw new Error("Créneau invalide ou déjà passé.");
  }

  const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000);
  const slotCapacity = getSlotCapacity();

  const student = await prisma.student.findUnique({
    where: { userId: params.userId },
    include: {
      user: true,
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        take: 1,
      },
      appointments: {
        where: { statut: APPOINTMENT_STATUSES.SCHEDULED },
      },
    },
  });

  const registration = student?.registrations[0];
  if (!student || !registration) {
    throw new Error("Veuillez d'abord compléter votre dossier étudiant.");
  }

  const paidStatuses: RegistrationStatus[] = [
    REGISTRATION_STATUSES.PAID,
    REGISTRATION_STATUSES.DOCS_INCOMPLETE,
    REGISTRATION_STATUSES.DOCS_COMPLETE,
    REGISTRATION_STATUSES.VALIDATED,
  ];
  if (!paidStatuses.includes(registration.statut as RegistrationStatus)) {
    throw new Error("Réglez d'abord vos frais d'inscription avant de réserver un créneau.");
  }

  if (student.appointments.length > 0 && !params.replaceExisting) {
    throw new Error("Vous avez déjà un rendez-vous actif. Annulez-le pour en choisir un autre.");
  }

  const bookedCount = await prisma.appointment.count({
    where: {
      debut: start,
      statut: APPOINTMENT_STATUSES.SCHEDULED,
    },
  });

  if (bookedCount >= slotCapacity) {
    throw new Error("Ce créneau vient d'être complet. Veuillez en choisir un autre.");
  }

  const appointment = await prisma.$transaction(async (tx) => {
    if (params.replaceExisting && student.appointments.length > 0) {
      await tx.appointment.updateMany({
        where: {
          studentId: student.id,
          statut: APPOINTMENT_STATUSES.SCHEDULED,
        },
        data: { statut: APPOINTMENT_STATUSES.CANCELLED },
      });
    }

    return tx.appointment.create({
      data: {
        studentId: student.id,
        debut: start,
        fin: end,
        statut: APPOINTMENT_STATUSES.SCHEDULED,
      },
    });
  });

  const formattedSlot = start.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });

  await notifyUser({
    userId: student.user.id,
    email: student.user.email,
    type: "APPOINTMENT_CONFIRMED",
    message: params.replaceExisting
      ? `Votre rendez-vous a été déplacé au ${formattedSlot}.`
      : `Votre rendez-vous est confirmé pour le ${formattedSlot}.`,
    emailSubject: "Confirmation de rendez-vous — SmartInscription IA",
    emailHtml: `<p>Bonjour ${student.user.prenom},</p><p>Votre rendez-vous est fixé au <strong>${formattedSlot}</strong>.</p>`,
  });

  return appointment;
}

/** Annule un rendez-vous planifié appartenant à l'étudiant et notifie. */
export async function cancelStudentAppointment(params: {
  userId: string;
  appointmentId: string;
}) {
  const student = await prisma.student.findUnique({
    where: { userId: params.userId },
    include: { user: true },
  });

  if (!student) {
    throw new Error("Profil étudiant introuvable.");
  }

  const res = await prisma.appointment.updateMany({
    where: {
      id: params.appointmentId,
      studentId: student.id,
      statut: APPOINTMENT_STATUSES.SCHEDULED,
    },
    data: { statut: APPOINTMENT_STATUSES.CANCELLED },
  });

  if (res.count > 0) {
    await notifyUser({
      userId: student.user.id,
      email: student.user.email,
      type: "APPOINTMENT_CONFIRMED",
      message: "Votre rendez-vous a bien été annulé. Vous pouvez choisir un nouveau créneau.",
      emailSubject: "Annulation de rendez-vous — SmartInscription IA",
      emailHtml: `<p>Bonjour ${student.user.prenom},</p><p>Votre rendez-vous a été annulé.</p>`,
    });
  }
}

/** Met à jour le statut d'un rendez-vous (AGENT ou ADMIN uniquement). */
export async function updateAppointmentStatus(params: {
  appointmentId: string;
  status: "COMPLETED" | "NO_SHOW";
  reviewerRole: Role;
}) {
  if (params.reviewerRole !== ROLES.AGENT && params.reviewerRole !== ROLES.ADMIN) {
    throw new Error("Action réservée aux agents et administrateurs.");
  }

  await prisma.appointment.update({
    where: { id: params.appointmentId },
    data: { statut: params.status },
  });
}
