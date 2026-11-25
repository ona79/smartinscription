import {
  CURRENT_ACADEMIC_YEAR,
  DOCUMENT_TYPES,
  PAYMENT_STATUSES,
} from "@smartinscription/shared";
import {
  buildCardQrPayload,
  renderCardQrSvg,
} from "@/features/carte-qr/services/card-qr-service";
import { getSignedDocumentUrl } from "@/features/documents/services/document-service";
import { buildAcademicTableColumns } from "@/features/dossier/lib/academic-table";
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
    select: {
      id: true,
      nom: true,
      code: true,
      filieres: {
        orderBy: { nom: "asc" },
        select: {
          id: true,
          nom: true,
          ufrId: true,
        },
      },
    },
  });
}

/** Récupère le profil étudiant et l'inscription de l'année académique courante (champs légers). */
export async function getStudentDashboardData(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      numeroEtudiant: true,
      niveau: true,
      birthDate: true,
      birthPlace: true,
      nationality: true,
      ufr: {
        select: { nom: true, code: true },
      },
      filiere: {
        select: { nom: true },
      },
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        select: {
          id: true,
          anneeAcademique: true,
          statut: true,
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

/** Récupère les données complètes de la carte étudiante numérique + photo signée + QR d'identité + tableau SCOLARITÉ/BU. */
export async function getStudentDossierWithCard(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      numeroEtudiant: true,
      niveau: true,
      birthDate: true,
      birthPlace: true,
      nationality: true,
      cardQrVersion: true,
      ufr: { select: { nom: true, code: true } },
      filiere: { select: { nom: true } },
      registrations: {
        orderBy: { anneeAcademique: "asc" },
        select: {
          id: true,
          anneeAcademique: true,
          niveau: true,
          statut: true,
          buStatus: true,
          buValidatedAt: true,
          payments: {
            where: { statut: PAYMENT_STATUSES.SUCCESS },
            select: { qrToken: true },
            take: 1,
          },
          documents: {
            where: { type: DOCUMENT_TYPES.PHOTO },
            select: {
              id: true,
              url: true,
              verificationStatus: true,
              motif: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  const registration =
    student?.registrations.find((r) => r.anneeAcademique === CURRENT_ACADEMIC_YEAR) ??
    student?.registrations[student.registrations.length - 1] ??
    null;
  const photoDoc = registration?.documents[0] ?? null;
  const qrToken = registration?.payments[0]?.qrToken ?? null;

  const cardQrPayload = student
    ? buildCardQrPayload({ studentId: student.id, version: student.cardQrVersion })
    : null;

  const [photoUrl, cardQrSvg] = await Promise.all([
    photoDoc
      ? getSignedDocumentUrl(photoDoc.url, {
          expiresInSeconds: 600,
          isPhoto: true,
        })
      : Promise.resolve(null),
    cardQrPayload ? renderCardQrSvg(cardQrPayload) : Promise.resolve(null),
  ]);

  const cardQrSvgUrl = cardQrSvg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(cardQrSvg)}`
    : null;

  const academicColumns =
    student && registration
      ? buildAcademicTableColumns({
          currentAcademicYear: registration.anneeAcademique,
          currentNiveau: registration.niveau ?? student.niveau,
          registrations: student.registrations,
        })
      : [];

  return {
    student,
    registration,
    photoDoc,
    photoUrl,
    cardQrSvgUrl,
    academicColumns,
    isPaid: Boolean(qrToken),
  };
}

/** Récupère le profil étudiant, son inscription et ses paiements pour /etudiant/paiement. */
export async function getStudentPaiementData(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      numeroEtudiant: true,
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        select: {
          id: true,
          statut: true,
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              statut: true,
              qrToken: true,
              receiptNumber: true,
              providerRef: true,
              montant: true,
              moyen: true,
              paidAt: true,
              createdAt: true,
            },
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

/** Récupère le profil étudiant, son inscription et ses pièces pour /etudiant/documents en 1 requête. */
export async function getStudentDocumentsData(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        select: {
          id: true,
          statut: true,
          documents: {
            select: {
              id: true,
              type: true,
              verificationStatus: true,
              motif: true,
            },
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
