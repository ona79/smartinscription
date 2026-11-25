/**
 * Utilitaire de mesure des performances côté serveur (actif en développement
 * ou lorsque PERF_LOG=1 est défini pour les mesures locales).
 */
export function isPerfEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.PERF_LOG === "1";
}

export type PerfCategory = "auth" | "prisma" | "page";

export async function measurePerf<T>(
  category: PerfCategory,
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isPerfEnabled()) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = performance.now() - start;
    console.info(`[perf][${category}] ${label}: ${durationMs.toFixed(1)}ms`);
  }
}
