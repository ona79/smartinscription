/**
 * Garde-fous pour le script de données de démonstration (seed-demo).
 * Séparé pour être testable unitairement sans déclencher d'accès base.
 */
export function assertDemoSeedAllowed(env: NodeJS.ProcessEnv = process.env): {
  demoPassword: string;
} {
  if (env.NODE_ENV === "production" && env.SEED_ALLOW_PROD !== "true") {
    throw new Error(
      "[seed-demo] Refus d'exécution en production (NODE_ENV=production). Définissez SEED_ALLOW_PROD=true pour forcer."
    );
  }

  const demoPassword = env.SEED_DEMO_PASSWORD?.trim();
  if (env.NODE_ENV === "production" && !demoPassword) {
    throw new Error(
      "[seed-demo] SEED_DEMO_PASSWORD est obligatoire lorsque NODE_ENV=production."
    );
  }

  return {
    demoPassword: demoPassword || "DemoPass2026!",
  };
}
