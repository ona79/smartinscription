import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const IA_BASE_URL =
  process.env.IA_SERVICE_URL ||
  process.env.NEXT_PUBLIC_IA_SERVICE_URL ||
  "http://localhost:8000";

/**
 * Endpoint de surveillance de l'état applicatif (base de données + service IA).
 * Ne retourne aucune donnée sensible.
 */
export async function GET() {
  let dbStatus: "ok" | "error" = "error";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "ok";
  } catch {
    dbStatus = "error";
  }

  let iaStatus: "ok" | "unavailable" = "unavailable";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${IA_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (res.ok) {
      iaStatus = "ok";
    }
  } catch {
    iaStatus = "unavailable";
  } finally {
    clearTimeout(timeoutId);
  }

  const healthy = dbStatus === "ok" && iaStatus === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        ia: iaStatus,
      },
    },
    { status: dbStatus === "ok" ? 200 : 503 }
  );
}
