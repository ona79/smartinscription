import type { Role } from "@smartinscription/shared";

export interface TestAccountItem {
  roleLabel: string;
  email: string;
  password: string;
}

/** Vérifie si l'aide aux comptes de test est activée via ENABLE_TEST_ACCOUNTS="true". */
export function isTestAccountsEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.ENABLE_TEST_ACCOUNTS === "true";
}

function buildTestAccountItems(
  env: Record<string, string | undefined>
): { ok: boolean; accounts?: TestAccountItem[]; error?: string } {
  const candidates: { role: Role; roleLabel: string; email: string; password?: string }[] = [
    {
      role: "ADMIN",
      roleLabel: "Administrateur",
      email: "admin@smartinscription.sn",
      password: env.SEED_ADMIN_PASSWORD,
    },
    {
      role: "AGENT",
      roleLabel: "Agent scolarité",
      email: "agent@smartinscription.sn",
      password: env.SEED_AGENT_PASSWORD,
    },
    {
      role: "STUDENT",
      roleLabel: "Étudiant",
      email: "etudiant@smartinscription.sn",
      password: env.SEED_STUDENT_PASSWORD,
    },
  ];

  const accounts = candidates
    .filter((item): item is typeof item & { password: string } => Boolean(item.password))
    .map(({ roleLabel, email, password }) => ({ roleLabel, email, password }));

  if (accounts.length === 0) {
    return {
      ok: false,
      error: "Aucun mot de passe SEED_*_PASSWORD configuré dans .env.",
    };
  }

  return { ok: true, accounts };
}

/** Retourne les comptes de test sans mot de passe d'accès lorsque ENABLE_TEST_ACCOUNTS=true. */
export function getPublicTestAccounts(
  env: Record<string, string | undefined> = process.env
): { ok: boolean; accounts?: TestAccountItem[]; error?: string } {
  if (!isTestAccountsEnabled(env)) {
    return { ok: false, error: "Comptes de test désactivés." };
  }
  return buildTestAccountItems(env);
}

/** Vérifie le code d'accès et construit la liste des comptes depuis les variables d'env. */
export function getUnlockedTestAccounts(
  passcode: string,
  env: Record<string, string | undefined> = process.env
): { ok: boolean; accounts?: TestAccountItem[]; error?: string } {
  if (!isTestAccountsEnabled(env)) {
    return { ok: false, error: "Comptes de test désactivés." };
  }

  const expected = env.TEST_ACCOUNTS_PASSCODE;
  if (!expected || passcode.trim() !== expected) {
    return { ok: false, error: "Code d'accès incorrect." };
  }

  return buildTestAccountItems(env);
}
