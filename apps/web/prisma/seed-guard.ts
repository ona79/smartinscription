import { Role } from "../src/generated/prisma/client";

/** Refuse d'exécuter le seed en production sauf si SEED_ALLOW_PROD=true. */
export function assertSeedAllowed(
  env: Record<string, string | undefined> = process.env
): void {
  if (env.NODE_ENV === "production" && env.SEED_ALLOW_PROD !== "true") {
    throw new Error(
      "Le seed est bloqué en production (NODE_ENV=production). Définissez SEED_ALLOW_PROD=true pour autoriser explicitement."
    );
  }
}

/** Résout les mots de passe des comptes de test depuis les variables d'environnement. */
export function resolveSeedPasswords(
  env: Record<string, string | undefined> = process.env
): Record<Role, string> {
  const isProd = env.NODE_ENV === "production";
  const admin = env.SEED_ADMIN_PASSWORD || (isProd ? "" : "SmartPass2026!");
  const agent = env.SEED_AGENT_PASSWORD || (isProd ? "" : "SmartPass2026!");
  const student = env.SEED_STUDENT_PASSWORD || (isProd ? "" : "SmartPass2026!");

  if (!admin || !agent || !student) {
    throw new Error(
      "SEED_ADMIN_PASSWORD, SEED_AGENT_PASSWORD et SEED_STUDENT_PASSWORD sont obligatoires en production."
    );
  }

  return {
    ADMIN: admin,
    AGENT: agent,
    STUDENT: student,
  };
}
