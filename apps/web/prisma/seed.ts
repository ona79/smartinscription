import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { assertSeedAllowed, resolveSeedPasswords } from "./seed-guard";

assertSeedAllowed();

const connectionString =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/smartinscription";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORDS = resolveSeedPasswords();

const UFR_DATA = [
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

interface SeedUserSpec {
  fallbackId: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: Role;
}

const SEED_USERS: SeedUserSpec[] = [
  {
    fallbackId: "00000000-0000-4000-8000-000000000001",
    email: "admin@smartinscription.sn",
    nom: "Diop",
    prenom: "Aminata",
    telephone: "+221770000001",
    role: Role.ADMIN,
  },
  {
    fallbackId: "00000000-0000-4000-8000-000000000002",
    email: "agent@smartinscription.sn",
    nom: "Ndiaye",
    prenom: "Moussa",
    telephone: "+221770000002",
    role: Role.AGENT,
  },
  {
    fallbackId: "00000000-0000-4000-8000-000000000003",
    email: "etudiant@smartinscription.sn",
    nom: "Fall",
    prenom: "Cheikh",
    telephone: "+221770000003",
    role: Role.STUDENT,
  },
];

async function resolveSupabaseUserId(spec: SeedUserSpec): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes("[YOUR-PROJECT-REF]")) {
    return spec.fallbackId;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: spec.email,
    password: SEED_PASSWORDS[spec.role],
    email_confirm: true,
    user_metadata: {
      nom: spec.nom,
      prenom: spec.prenom,
      role: spec.role,
    },
  });

  if (created.user) {
    return created.user.id;
  }

  if (error) {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = listData?.users.find((u) => u.email === spec.email);
    if (existing) {
      return existing.id;
    }
    console.warn(`Supabase Auth seed warning for ${spec.email}: ${error.message}`);
  }

  return spec.fallbackId;
}

async function main() {
  console.log("Seeding SmartInscription IA database...");

  // 1. Seed UFRs and Filieres
  let firstUfrId = "";
  let firstFiliereId = "";

  for (const ufrItem of UFR_DATA) {
    const ufr = await prisma.uFR.upsert({
      where: { code: ufrItem.code },
      update: { nom: ufrItem.nom },
      create: {
        code: ufrItem.code,
        nom: ufrItem.nom,
      },
    });

    if (!firstUfrId) {
      firstUfrId = ufr.id;
    }

    for (const filiereName of ufrItem.filieres) {
      const existingFiliere = await prisma.filiere.findFirst({
        where: { nom: filiereName, ufrId: ufr.id },
      });

      const filiere =
        existingFiliere ??
        (await prisma.filiere.create({
          data: {
            nom: filiereName,
            ufrId: ufr.id,
          },
        }));

      if (!firstFiliereId) {
        firstFiliereId = filiere.id;
      }
    }
  }

  // 2. Seed Users (Admin, Agent, Student)
  for (const spec of SEED_USERS) {
    const userId = await resolveSupabaseUserId(spec);

    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        nom: spec.nom,
        prenom: spec.prenom,
        telephone: spec.telephone,
        role: spec.role,
      },
      create: {
        id: userId,
        email: spec.email,
        nom: spec.nom,
        prenom: spec.prenom,
        telephone: spec.telephone,
        role: spec.role,
      },
    });

    if (spec.role === Role.STUDENT && firstUfrId && firstFiliereId) {
      const student = await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          numeroEtudiant: "SN-2026-0001",
          ufrId: firstUfrId,
          filiereId: firstFiliereId,
          niveau: "L1",
        },
      });

      const registration = await prisma.registration.upsert({
        where: {
          studentId_anneeAcademique: {
            studentId: student.id,
            anneeAcademique: "2026-2027",
          },
        },
        update: {},
        create: {
          studentId: student.id,
          anneeAcademique: "2026-2027",
          statut: "PAID",
        },
      });

      await prisma.payment.upsert({
        where: { providerRef: "SEED-PAY-2026-0001" },
        update: {},
        create: {
          registrationId: registration.id,
          montant: 25000,
          moyen: "WAVE",
          statut: "SUCCESS",
          providerRef: "SEED-PAY-2026-0001",
          paidAt: new Date(),
          receiptNumber: "REC-2026-000001",
          qrToken: "seed_demo_qr_token_smartinscription_2026_valid_32bytes",
        },
      });
    }
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
