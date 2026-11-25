import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isPerfEnabled } from "@/lib/perf";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/smartinscription";

const adapter = new PrismaPg({
  connectionString,
  max: process.env.NODE_ENV !== "production" ? 5 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

function createPrismaClient() {
  const base = new PrismaClient({ adapter });
  if (!isPerfEnabled()) {
    return base;
  }

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now();
          try {
            return await query(args);
          } finally {
            const durationMs = performance.now() - start;
            console.info(`[perf][prisma] ${model}.${operation}: ${durationMs.toFixed(1)}ms`);
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

/** Client Prisma singleton configuré pour PostgreSQL via l'adaptateur pg. */
export const prisma = (globalForPrisma.prisma ?? createPrismaClient()) as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma as unknown as ExtendedPrismaClient;
}
