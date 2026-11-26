import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRENT_ACADEMIC_YEAR } from "@smartinscription/shared";
import {
  AppointmentStatus,
  BuStatus,
  DocumentStatus,
  DocumentType,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  RegistrationStatus,
  Role,
} from "../src/generated/prisma/client";
import { assertDemoSeedAllowed } from "./seed-demo-guard";

const DEMO_EMAIL_PREFIX = "demo.";
const DEMO_STUDENT_COUNT = 300;
const ACADEMIC_YEAR = CURRENT_ACADEMIC_YEAR;
const FEE_FCFA = 25000;

/** Année académique précédente, déduite de l'année courante pour éviter tout décalage. */
function previousAcademicYear(year: string): string {
  const start = Number(year.slice(0, 4));
  return `${start - 1}-${start}`;
}

const FIRST_NAMES = [
  "Aminata",
  "Fatou",
  "Awa",
  "Mariama",
  "Khadija",
  "Ndeye",
  "Mame",
  "Coumba",
  "Aïssatou",
  "Sokhna",
  "Moussa",
  "Cheikh",
  "Mamadou",
  "Ibrahima",
  "Ousmane",
  "Abdoulaye",
  "Modou",
  "Pape",
  "Babacar",
  "Lamine",
];

const LAST_NAMES = [
  "Diop",
  "Ndiaye",
  "Fall",
  "Sow",
  "Ba",
  "Diallo",
  "Gueye",
  "Faye",
  "Mbaye",
  "Sarr",
  "Sy",
  "Kane",
  "Cissé",
  "Thiam",
  "Seck",
  "Ndour",
  "Diouf",
  "Touré",
  "Camara",
  "Samb",
];

const LEVELS = ["L1", "L2", "L3", "M1", "M2"] as const;

const UFR_FALLBACK = [
  {
    code: "UFR-ST",
    nom: "UFR Sciences et Technologies",
    filieres: ["Informatique", "Mathématiques Appliquées", "Physique-Chimie"],
  },
  {
    code: "UFR-SEG",
    nom: "UFR Sciences Économiques et de Gestion",
    filieres: ["Économie Appliquée", "Gestion des Entreprises", "Finance-Comptabilité"],
  },
  {
    code: "UFR-LSH",
    nom: "UFR Lettres et Sciences Humaines",
    filieres: ["Lettres Modernes", "Sociologie", "Langues Étrangères Appliquées"],
  },
  {
    code: "UFR-SJP",
    nom: "UFR Sciences Juridiques et Politiques",
    filieres: ["Droit Public", "Droit Privé", "Sciences Politiques"],
  },
];

const connectionString =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/smartinscription";

const adapter = new PrismaPg({ connectionString, max: 5 });
const prisma = new PrismaClient({ adapter });

function demoUuid(index: number): string {
  const hex = index.toString(16).padStart(12, "0");
  return `00000000-0000-4000-9000-${hex}`;
}

/** Générateur pseudo-aléatoire déterministe (LCG) pour reproductibilité. */
function createRng(seed = 20261125) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pickRegistrationStatus(index: number): RegistrationStatus {
  // Distribution réaliste sur 300 étudiants :
  // 8% DRAFT, 12% PENDING_PAYMENT, 18% PAID, 17% DOCS_INCOMPLETE, 15% DOCS_COMPLETE, 25% VALIDATED, 5% REJECTED
  const bucket = index % 100;
  if (bucket < 8) return RegistrationStatus.DRAFT;
  if (bucket < 20) return RegistrationStatus.PENDING_PAYMENT;
  if (bucket < 38) return RegistrationStatus.PAID;
  if (bucket < 55) return RegistrationStatus.DOCS_INCOMPLETE;
  if (bucket < 70) return RegistrationStatus.DOCS_COMPLETE;
  if (bucket < 95) return RegistrationStatus.VALIDATED;
  return RegistrationStatus.REJECTED;
}

function pickPaymentMethod(rand: () => number): PaymentMethod {
  // Wave (~42%) et Orange Money (~35%) majoritaires
  const r = rand();
  if (r < 0.42) return PaymentMethod.WAVE;
  if (r < 0.77) return PaymentMethod.ORANGE_MONEY;
  if (r < 0.88) return PaymentMethod.FREE_MONEY;
  if (r < 0.95) return PaymentMethod.WIZALL;
  return PaymentMethod.CARD;
}

function pickPaymentTimestamp(rand: () => number, now: Date): Date {
  // Étaler sur les 21 derniers jours avec plus de trafic en début de semaine (lun-mer)
  // et pic le matin entre 9h et 11h.
  let daysAgo = Math.floor(rand() * 21);
  const candidate = new Date(now);
  candidate.setDate(candidate.getDate() - daysAgo);
  const dow = candidate.getDay(); // 0=dim, 1=lun..6=sam
  if ((dow === 0 || dow === 6) && rand() < 0.75) {
    daysAgo = Math.max(0, daysAgo - ((dow === 0 ? 5 : 4) % 21));
    candidate.setTime(now.getTime());
    candidate.setDate(candidate.getDate() - daysAgo);
  }

  const hourRoll = rand();
  const hour =
    hourRoll < 0.55
      ? 9 + Math.floor(rand() * 3) // 9h - 11h (pic matinal)
      : hourRoll < 0.85
        ? 12 + Math.floor(rand() * 5) // 12h - 16h
        : 17 + Math.floor(rand() * 4); // 17h - 20h
  const minute = Math.floor(rand() * 60);
  candidate.setHours(hour, minute, Math.floor(rand() * 60), 0);
  return candidate;
}

interface ActivityLogClient {
  createMany?: (args: {
    data: {
      id?: string;
      userId: string | null;
      type: "LOGIN" | "CHECK_IN";
      createdAt: Date;
      meta?: Record<string, unknown>;
    }[];
  }) => Promise<{ count: number }>;
  deleteMany?: (args: { where: { userId: { in: string[] } } }) => Promise<{ count: number }>;
}

async function resetDemoData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length === 0) {
    console.log("[seed-demo] Aucune donnée demo.* à supprimer.");
    return { deletedUsers: 0, deletedFraudAlerts: 0, deletedActivityLogs: 0 };
  }

  const activityLog = (prisma as unknown as { activityLog?: ActivityLogClient }).activityLog;
  let deletedActivityLogs = 0;
  if (activityLog?.deleteMany) {
    const res = await activityLog.deleteMany({ where: { userId: { in: demoUserIds } } });
    deletedActivityLogs = res.count;
  }

  const deletedFraudAlerts = await prisma.fraudAlert.deleteMany({
    where: {
      OR: [
        { type: { startsWith: "DEMO_" } },
        { payment: { providerRef: { startsWith: "DEMO-" } } },
        { registration: { student: { userId: { in: demoUserIds } } } },
      ],
    },
  });

  // La suppression des Users cascade vers Student, Registration, Payment, Document, Appointment, Notification
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: demoUserIds } },
  });

  console.log(
    `[seed-demo:reset] Supprimé : ${deletedUsers.count} utilisateurs demo.* (cascade), ${deletedFraudAlerts.count} FraudAlert, ${deletedActivityLogs} ActivityLog.`
  );
  return {
    deletedUsers: deletedUsers.count,
    deletedFraudAlerts: deletedFraudAlerts.count,
    deletedActivityLogs,
  };
}

async function ensureUfrsAndFilieres() {
  const ufrs = await prisma.uFR.findMany({
    include: { filieres: true },
    orderBy: { code: "asc" },
  });

  if (ufrs.length === 0) {
    for (const item of UFR_FALLBACK) {
      const ufr = await prisma.uFR.create({
        data: {
          code: item.code,
          nom: item.nom,
          filieres: {
            create: item.filieres.map((nom) => ({ nom })),
          },
        },
        include: { filieres: true },
      });
      ufrs.push(ufr);
    }
  }

  return ufrs.filter((u) => u.filieres.length > 0);
}

async function main() {
  const { demoPassword } = assertDemoSeedAllowed();
  const isResetOnly = process.argv.includes("--reset");

  if (isResetOnly) {
    await resetDemoData();
    return;
  }

  // Idempotence : nettoyer d'éventuelles données demo.* précédentes sans toucher aux comptes normaux
  await resetDemoData();

  const rand = createRng();
  const now = new Date();
  const ufrs = await ensureUfrsAndFilieres();
  const passwordHash = createHash("sha256").update(demoPassword).digest("hex").slice(0, 12);
  console.log(
    `[seed-demo] Génération de ${DEMO_STUDENT_COUNT} étudiants (mot de passe configuré, hash=${passwordHash})...`
  );

  // 1. Créer les 300 User demo.*
  const usersData = Array.from({ length: DEMO_STUDENT_COUNT }, (_, idx) => {
    const n = idx + 1;
    const prenom = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const nom = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    return {
      id: demoUuid(n),
      email: `${DEMO_EMAIL_PREFIX}${n}@smartinscription.sn`,
      nom,
      prenom,
      telephone: `+22177${String(100000 + n).padStart(6, "0")}`,
      role: Role.STUDENT,
    };
  });
  await prisma.user.createMany({ data: usersData });

  // 2. Créer les 300 Student
  const BIRTH_CITIES = [
    "Dakar",
    "Ziguinchor",
    "Saint-Louis",
    "Thiès",
    "Kaolack",
    "Tambacounda",
    "Kolda",
    "Louga",
  ];
  const studentsData = usersData.map((u, idx) => {
    const n = idx + 1;
    const ufr = ufrs[idx % ufrs.length];
    const filiere = ufr.filieres[idx % ufr.filieres.length];
    const niveau = LEVELS[idx % LEVELS.length];
    const birthYear = 2000 + (idx % 7);
    const birthMonth = idx % 12;
    const birthDay = 1 + (idx % 28);
    return {
      id: `demo-stu-${n}`,
      userId: u.id,
      numeroEtudiant: `DEMO-2026-${String(n).padStart(4, "0")}`,
      ufrId: ufr.id,
      filiereId: filiere.id,
      niveau,
      birthDate: new Date(Date.UTC(birthYear, birthMonth, birthDay)),
      birthPlace: BIRTH_CITIES[idx % BIRTH_CITIES.length],
      nationality: "Sénégalaise",
    };
  });
  await prisma.student.createMany({ data: studentsData });

  // 3. Créer les 300 Registration (+ ~40% d'historique antérieur pour L2/L3/M1/M2 et 2 doublons fraude)
  const agentUser = await prisma.user.findFirst({
    where: { role: { in: [Role.AGENT, Role.ADMIN] } },
    select: { id: true },
  });

  const registrationsData = studentsData.map((s, idx) => {
    const n = idx + 1;
    const statut = pickRegistrationStatus(idx);
    const buActive = statut === RegistrationStatus.VALIDATED && idx % 10 < 7;
    return {
      id: `demo-reg-${n}`,
      studentId: s.id,
      anneeAcademique: ACADEMIC_YEAR,
      niveau: s.niveau,
      statut,
      buStatus: buActive ? BuStatus.ACTIVE : BuStatus.NONE,
      buValidatedAt: buActive ? new Date(now.getTime() - (idx % 14) * 86400_000) : null,
      buValidatedById: buActive ? (agentUser?.id ?? null) : null,
    };
  });

  const previousYear = previousAcademicYear(ACADEMIC_YEAR);
  const twoYearsAgo = previousAcademicYear(previousYear);
  const PRIOR_LEVELS: Record<string, { year: string; niveau: string }[]> = {
    L2: [{ year: previousYear, niveau: "L1" }],
    L3: [
      { year: previousYear, niveau: "L2" },
      { year: twoYearsAgo, niveau: "L1" },
    ],
    M1: [{ year: previousYear, niveau: "L3" }],
    M2: [{ year: previousYear, niveau: "M1" }],
  };

  const historicalRegistrations: {
    id: string;
    studentId: string;
    anneeAcademique: string;
    niveau: string;
    statut: RegistrationStatus;
    buStatus: BuStatus;
    buValidatedAt: Date | null;
    buValidatedById: string | null;
  }[] = [];

  studentsData.forEach((s, idx) => {
    // Garde les 2 premiers étudiants pour les doublons fraude ci-dessous
    if (idx < 2) return;
    const priors = PRIOR_LEVELS[s.niveau];
    if (!priors || idx % 5 >= 2) return; // ~40% des L2, L3, M1, M2
    priors.forEach((p, pIdx) => {
      historicalRegistrations.push({
        id: `demo-reg-hist-${idx + 1}-${pIdx + 1}`,
        studentId: s.id,
        anneeAcademique: p.year,
        niveau: p.niveau,
        statut: RegistrationStatus.VALIDATED,
        buStatus: BuStatus.ACTIVE,
        buValidatedAt: new Date(`${p.year.slice(0, 4)}-11-15T10:00:00.000Z`),
        buValidatedById: agentUser?.id ?? null,
      });
    });
  });

  // 2 étudiants inscrits deux fois (campagne précédente chevauchante)
  const duplicateRegistrations = [
    {
      id: "demo-reg-dup-1",
      studentId: studentsData[0].id,
      anneeAcademique: previousYear,
      niveau: studentsData[0].niveau,
      statut: RegistrationStatus.PAID,
      buStatus: BuStatus.NONE,
      buValidatedAt: null,
      buValidatedById: null,
    },
    {
      id: "demo-reg-dup-2",
      studentId: studentsData[1].id,
      anneeAcademique: previousYear,
      niveau: studentsData[1].niveau,
      statut: RegistrationStatus.PAID,
      buStatus: BuStatus.NONE,
      buValidatedAt: null,
      buValidatedById: null,
    },
  ];
  await prisma.registration.createMany({
    data: [...registrationsData, ...historicalRegistrations, ...duplicateRegistrations],
  });

  // 4. Créer les Payment (1 SUCCESS par inscription payée, + tentatives FAILED/PENDING, + 3 doublons)
  const paidStatuses = new Set<RegistrationStatus>([
    RegistrationStatus.PAID,
    RegistrationStatus.DOCS_INCOMPLETE,
    RegistrationStatus.DOCS_COMPLETE,
    RegistrationStatus.VALIDATED,
  ]);

  const paymentsData: {
    id: string;
    registrationId: string;
    montant: number;
    moyen: PaymentMethod;
    statut: PaymentStatus;
    providerRef: string;
    paidAt: Date | null;
    receiptNumber: string | null;
    qrToken: string | null;
    createdAt: Date;
  }[] = [];

  const documentsData: {
    id: string;
    registrationId: string;
    type: DocumentType;
    url: string;
    verificationStatus: DocumentStatus;
    motif: string | null;
  }[] = [];

  const appointmentsData: {
    id: string;
    studentId: string;
    debut: Date;
    fin: Date;
    statut: AppointmentStatus;
  }[] = [];

  const notificationsData: {
    id: string;
    userId: string;
    type: string;
    message: string;
    lu: boolean;
    createdAt: Date;
  }[] = [];

  const activityLogsData: {
    userId: string;
    type: "LOGIN" | "CHECK_IN";
    createdAt: Date;
    meta: Record<string, unknown>;
  }[] = [];

  const fraudAlertsData: {
    id: string;
    paymentId: string | null;
    registrationId: string | null;
    type: string;
    score: number;
    resolu: boolean;
  }[] = [];

  const docTypes = [
    DocumentType.ID_CARD,
    DocumentType.TRANSCRIPT,
    DocumentType.DIPLOMA,
    DocumentType.PHOTO,
  ];

  let receiptSeq = 1;
  let docSeq = 1;
  let apptSeq = 1;
  let notifSeq = 1;
  const paidRegIds: string[] = [];

  for (let idx = 0; idx < registrationsData.length; idx++) {
    const reg = registrationsData[idx];
    const student = studentsData[idx];
    const userId = student.userId;

    // ActivityLog LOGIN réaliste (entre 8h et 21h)
    const loginTime = pickPaymentTimestamp(rand, now);
    activityLogsData.push({
      userId,
      type: "LOGIN",
      createdAt: loginTime,
      meta: { source: "demo" },
    });

    if (paidStatuses.has(reg.statut)) {
      paidRegIds.push(reg.id);
      const paidAt = pickPaymentTimestamp(rand, now);
      const seq = receiptSeq++;
      paymentsData.push({
        id: `demo-pay-${seq}`,
        registrationId: reg.id,
        montant: FEE_FCFA,
        moyen: pickPaymentMethod(rand),
        statut: PaymentStatus.SUCCESS,
        providerRef: `DEMO-PAY-2026-${String(seq).padStart(4, "0")}`,
        paidAt,
        receiptNumber: `DEMO-REC-2026-${String(seq).padStart(4, "0")}`,
        qrToken: `demo-qr-${String(seq).padStart(4, "0")}`,
        createdAt: paidAt,
      });

      notificationsData.push({
        id: `demo-notif-${notifSeq++}`,
        userId,
        type: "PAYMENT_CONFIRMED",
        message: `Votre paiement de ${FEE_FCFA.toLocaleString("fr-FR")} FCFA a été confirmé.`,
        lu: rand() < 0.65,
        createdAt: paidAt,
      });

      // Check-in pour ~35% des dossiers payés
      if (rand() < 0.35) {
        const checkInAt = new Date(paidAt.getTime() + 3600 * 1000 * (2 + Math.floor(rand() * 48)));
        activityLogsData.push({
          userId,
          type: "CHECK_IN",
          createdAt: checkInAt > now ? now : checkInAt,
          meta: { registrationId: reg.id, source: "demo" },
        });
      }

      // Documents selon statut
      if (reg.statut === RegistrationStatus.VALIDATED || reg.statut === RegistrationStatus.DOCS_COMPLETE) {
        for (const dt of docTypes) {
          documentsData.push({
            id: `demo-doc-${docSeq++}`,
            registrationId: reg.id,
            type: dt,
            url: `demo/docs/${reg.id}/${dt.toLowerCase()}.pdf`,
            verificationStatus:
              reg.statut === RegistrationStatus.VALIDATED
                ? DocumentStatus.APPROVED
                : rand() < 0.5
                  ? DocumentStatus.APPROVED
                  : DocumentStatus.PENDING,
            motif: null,
          });
        }
      } else if (reg.statut === RegistrationStatus.DOCS_INCOMPLETE) {
        const count = 1 + Math.floor(rand() * 3);
        for (let d = 0; d < count; d++) {
          const isRejected = d === 0 && rand() < 0.4;
          documentsData.push({
            id: `demo-doc-${docSeq++}`,
            registrationId: reg.id,
            type: docTypes[d],
            url: `demo/docs/${reg.id}/${docTypes[d].toLowerCase()}.pdf`,
            verificationStatus: isRejected ? DocumentStatus.REJECTED : DocumentStatus.PENDING,
            motif: isRejected ? "Pièce illisible ou expirée" : null,
          });
        }
      }

      // Rendez-vous (passés et à venir) pour ~60% des dossiers payés
      if (rand() < 0.6) {
        const isPast = rand() < 0.45;
        const offsetDays = isPast ? -(1 + Math.floor(rand() * 10)) : 1 + Math.floor(rand() * 10);
        const debut = new Date(now);
        debut.setDate(debut.getDate() + offsetDays);
        const slotHour = 8 + Math.floor(rand() * 8);
        const slotMin = rand() < 0.5 ? 0 : 30;
        debut.setHours(slotHour, slotMin, 0, 0);
        const fin = new Date(debut.getTime() + 30 * 60 * 1000);

        const apptStatus = isPast
          ? rand() < 0.8
            ? AppointmentStatus.COMPLETED
            : AppointmentStatus.NO_SHOW
          : AppointmentStatus.SCHEDULED;

        appointmentsData.push({
          id: `demo-appt-${apptSeq++}`,
          studentId: student.id,
          debut,
          fin,
          statut: apptStatus,
        });
      }
    } else if (reg.statut === RegistrationStatus.PENDING_PAYMENT) {
      const attemptAt = pickPaymentTimestamp(rand, now);
      paymentsData.push({
        id: `demo-pay-pend-${idx + 1}`,
        registrationId: reg.id,
        montant: FEE_FCFA,
        moyen: pickPaymentMethod(rand),
        statut: rand() < 0.6 ? PaymentStatus.PENDING : PaymentStatus.FAILED,
        providerRef: `DEMO-TRY-2026-${String(idx + 1).padStart(4, "0")}`,
        paidAt: null,
        receiptNumber: null,
        qrToken: null,
        createdAt: attemptAt,
      });
    } else if (reg.statut === RegistrationStatus.REJECTED) {
      documentsData.push({
        id: `demo-doc-${docSeq++}`,
        registrationId: reg.id,
        type: DocumentType.DIPLOMA,
        url: `demo/docs/${reg.id}/diploma.pdf`,
        verificationStatus: DocumentStatus.REJECTED,
        motif: "Attestation non conforme",
      });
      notificationsData.push({
        id: `demo-notif-${notifSeq++}`,
        userId,
        type: "DOCUMENT_REJECTED",
        message: "Votre dossier nécessite une correction de pièce justificative.",
        lu: false,
        createdAt: now,
      });
    }
  }

  // 5. Cas de fraude plausibles :
  // a) 3 paiements en double (tentative dupliquée FAILED sur inscription déjà payée -> 1 seul SUCCESS conservé)
  for (let i = 0; i < 3 && i < paidRegIds.length; i++) {
    const regId = paidRegIds[i];
    const dupPayId = `demo-pay-dup-${i + 1}`;
    const dupAt = pickPaymentTimestamp(rand, now);
    paymentsData.push({
      id: dupPayId,
      registrationId: regId,
      montant: FEE_FCFA,
      moyen: PaymentMethod.WAVE,
      statut: PaymentStatus.FAILED,
      providerRef: `DEMO-DUP-PAY-${i + 1}`,
      paidAt: null,
      receiptNumber: null,
      qrToken: null,
      createdAt: dupAt,
    });
    fraudAlertsData.push({
      id: `demo-fraud-dup-pay-${i + 1}`,
      paymentId: dupPayId,
      registrationId: regId,
      type: "DEMO_DUPLICATE_PAYMENT",
      score: 0.91,
      resolu: false,
    });
  }

  // b) 2 étudiants inscrits deux fois
  duplicateRegistrations.forEach((dupReg, i) => {
    fraudAlertsData.push({
      id: `demo-fraud-dup-reg-${i + 1}`,
      paymentId: null,
      registrationId: dupReg.id,
      type: "DEMO_DUPLICATE_REGISTRATION",
      score: 0.87,
      resolu: false,
    });
  });

  // c) 2 dossiers incohérents
  for (let i = 0; i < 2; i++) {
    const reg = registrationsData[10 + i];
    fraudAlertsData.push({
      id: `demo-fraud-incoherent-${i + 1}`,
      paymentId: null,
      registrationId: reg.id,
      type: "DEMO_INCOHERENT_DOSSIER",
      score: 0.78,
      resolu: false,
    });
  }

  await prisma.payment.createMany({ data: paymentsData });
  await prisma.document.createMany({ data: documentsData });
  await prisma.appointment.createMany({ data: appointmentsData });
  await prisma.notification.createMany({ data: notificationsData });
  await prisma.fraudAlert.createMany({ data: fraudAlertsData });

  const activityLog = (prisma as unknown as { activityLog?: ActivityLogClient }).activityLog;
  let activityLogCount = 0;
  if (activityLog?.createMany && activityLogsData.length > 0) {
    const res = await activityLog.createMany({ data: activityLogsData });
    activityLogCount = res.count;
  }

  console.log("[seed-demo] Résumé des lignes créées :");
  console.log(`  - User         : ${usersData.length}`);
  console.log(`  - Student      : ${studentsData.length}`);
  console.log(`  - Registration : ${registrationsData.length + duplicateRegistrations.length}`);
  console.log(`  - Payment      : ${paymentsData.length}`);
  console.log(`  - Document     : ${documentsData.length}`);
  console.log(`  - Appointment  : ${appointmentsData.length}`);
  console.log(`  - Notification : ${notificationsData.length}`);
  console.log(`  - FraudAlert   : ${fraudAlertsData.length}`);
  console.log(
    `  - ActivityLog  : ${activityLogCount}${activityLog?.createMany ? "" : " (table absente sur dev avant fusion bloc0)"}`
  );
}

main()
  .catch((error) => {
    console.error("[seed-demo] Erreur :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
