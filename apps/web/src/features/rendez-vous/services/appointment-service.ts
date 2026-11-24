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

export interface AvailableSlot {
  startIso: string;
  endIso: string;
  dayLabel: string;
  timeLabel: string;
}

/** Génère les créneaux disponibles de 30 min sur les 5 prochains jours ouvrés. */
export function generateAvailableSlots(
  bookedStarts: Date[],
  now = new Date()
): AvailableSlot[] {
  const bookedTimestamps = new Set(bookedStarts.map((d) => d.getTime()));
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
      if (bookedTimestamps.has(start.getTime())) {
        continue;
      }

      const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000);
      const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      slots.push({
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        dayLabel,
        timeLabel,
      });
    }
  }

  return slots;
}

/** Réserve un créneau de rendez-vous pour un étudiant ayant payé son inscription. */
export async function bookStudentAppointment(params: {
  userId: string;
  startIso: string;
}) {
  const start = new Date(params.startIso);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw new Error("Créneau invalide ou déjà passé.");
  }

  const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000);

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

  if (student.appointments.length > 0) {
    throw new Error("Vous avez déjà un rendez-vous actif. Annulez-le pour en choisir un autre.");
  }

  const conflicting = await prisma.appointment.findFirst({
    where: {
      debut: start,
      statut: APPOINTMENT_STATUSES.SCHEDULED,
    },
  });

  if (conflicting) {
    throw new Error("Ce créneau vient d'être réservé. Veuillez en choisir un autre.");
  }

  const appointment = await prisma.appointment.create({
    data: {
      studentId: student.id,
      debut: start,
      fin: end,
      statut: APPOINTMENT_STATUSES.SCHEDULED,
    },
  });

  const formattedSlot = start.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });

  await notifyUser({
    userId: student.user.id,
    email: student.user.email,
    type: "APPOINTMENT_CONFIRMED",
    message: `Votre rendez-vous est confirmé pour le ${formattedSlot}.`,
    emailSubject: "Confirmation de rendez-vous — SmartInscription IA",
    emailHtml: `<p>Bonjour ${student.user.prenom},</p><p>Votre rendez-vous de validation est confirmé pour le <strong>${formattedSlot}</strong>.</p>`,
  });

  return appointment;
}

/** Annule un rendez-vous planifié appartenant à l'étudiant. */
export async function cancelStudentAppointment(params: {
  userId: string;
  appointmentId: string;
}) {
  const student = await prisma.student.findUnique({
    where: { userId: params.userId },
  });

  if (!student) {
    throw new Error("Profil étudiant introuvable.");
  }

  await prisma.appointment.updateMany({
    where: {
      id: params.appointmentId,
      studentId: student.id,
      statut: APPOINTMENT_STATUSES.SCHEDULED,
    },
    data: { statut: APPOINTMENT_STATUSES.CANCELLED },
  });
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
