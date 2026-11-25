import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { recordActivity } from "@/features/activity/record-activity";
import {
  getUnlockedTestAccounts,
  isTestAccountsEnabled,
} from "@/features/auth/lib/test-accounts";
import { updateSession } from "@/lib/supabase/middleware";
import { assertSeedAllowed, resolveSeedPasswords } from "../../../prisma/seed-guard";

describe("Garde du seed (assertSeedAllowed & resolveSeedPasswords)", () => {
  it("refuse le seed en production sans SEED_ALLOW_PROD=true", () => {
    expect(() =>
      assertSeedAllowed({ NODE_ENV: "production", SEED_ALLOW_PROD: "false" })
    ).toThrow(/bloqué en production/);
  });

  it("autorise le seed en production si SEED_ALLOW_PROD=true et mots de passe fournis", () => {
    expect(() =>
      assertSeedAllowed({ NODE_ENV: "production", SEED_ALLOW_PROD: "true" })
    ).not.toThrow();

    expect(() =>
      resolveSeedPasswords({ NODE_ENV: "production" })
    ).toThrow(/obligatoires en production/);

    const passwords = resolveSeedPasswords({
      NODE_ENV: "production",
      SEED_ADMIN_PASSWORD: "p1",
      SEED_AGENT_PASSWORD: "p2",
      SEED_STUDENT_PASSWORD: "p3",
    });
    expect(passwords).toEqual({ ADMIN: "p1", AGENT: "p2", STUDENT: "p3" });
  });
});

describe("Garde des comptes de test (isTestAccountsEnabled & getUnlockedTestAccounts)", () => {
  it("désactive les comptes de test si ENABLE_TEST_ACCOUNTS n'est pas true", () => {
    expect(isTestAccountsEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isTestAccountsEnabled({ NODE_ENV: "production", ENABLE_TEST_ACCOUNTS: "false" })
    ).toBe(false);

    const res = getUnlockedTestAccounts("code", {
      NODE_ENV: "production",
      TEST_ACCOUNTS_PASSCODE: "code",
    });
    expect(res.ok).toBe(false);
  });

  it("retourne les comptes uniquement en dev avec ENABLE_TEST_ACCOUNTS=true et bon code", () => {
    const env = {
      NODE_ENV: "development",
      ENABLE_TEST_ACCOUNTS: "true",
      TEST_ACCOUNTS_PASSCODE: "secret-dev",
      SEED_ADMIN_PASSWORD: "adm",
      SEED_AGENT_PASSWORD: "agt",
      SEED_STUDENT_PASSWORD: "std",
    };

    expect(getUnlockedTestAccounts("mauvais", env).ok).toBe(false);

    const okRes = getUnlockedTestAccounts("secret-dev", env);
    expect(okRes.ok).toBe(true);
    expect(okRes.accounts).toHaveLength(3);
  });
});

describe("Contrat recordActivity", () => {
  it("enregistre LOGIN et met à jour lastLoginAt", async () => {
    const createSpy = vi.fn().mockResolvedValue({ id: "act-1" });
    const updateSpy = vi.fn().mockResolvedValue({ id: "user-1" });
    const mockDb = {
      activityLog: { create: createSpy },
      user: { update: updateSpy },
    };

    await recordActivity("LOGIN", "user-1", undefined, { db: mockDb as never });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("capture toute erreur sans faire échouer l'appelant", async () => {
    const mockDb = {
      activityLog: { create: vi.fn().mockRejectedValue(new Error("DB down")) },
      user: { update: vi.fn() },
    };

    await expect(
      recordActivity("CHECK_IN", "user-1", { registrationId: "reg-1" }, { db: mockDb as never })
    ).resolves.toBeUndefined();
  });
});

describe("Redirections par rôle (proxy / updateSession)", () => {
  it("redirige vers /connexion sur une route protégée sans session", async () => {
    const req = new NextRequest("http://localhost:3000/etudiant");
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/connexion");
  });
});
