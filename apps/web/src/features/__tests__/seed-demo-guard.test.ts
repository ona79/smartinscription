import { describe, expect, it } from "vitest";
import { assertDemoSeedAllowed } from "../../../prisma/seed-demo-guard";

describe("Garde-fous seed-demo", () => {
  it("refuse de s'exécuter en production sans SEED_ALLOW_PROD=true", () => {
    expect(() =>
      assertDemoSeedAllowed({ NODE_ENV: "production", SEED_DEMO_PASSWORD: "secret" })
    ).toThrow(/NODE_ENV=production/);
  });

  it("refuse la production si SEED_DEMO_PASSWORD est absent", () => {
    expect(() =>
      assertDemoSeedAllowed({ NODE_ENV: "production", SEED_ALLOW_PROD: "true" })
    ).toThrow(/SEED_DEMO_PASSWORD/);
  });

  it("autorise l'exécution en production avec SEED_ALLOW_PROD=true et SEED_DEMO_PASSWORD", () => {
    const res = assertDemoSeedAllowed({
      NODE_ENV: "production",
      SEED_ALLOW_PROD: "true",
      SEED_DEMO_PASSWORD: "ProdDemoPassword2026!",
    });
    expect(res.demoPassword).toBe("ProdDemoPassword2026!");
  });

  it("autorise le développement avec un mot de passe par défaut", () => {
    const res = assertDemoSeedAllowed({ NODE_ENV: "development" });
    expect(res.demoPassword).toBe("DemoPass2026!");
  });
});
