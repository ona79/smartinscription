import { NextResponse, type NextRequest } from "next/server";
import { sendClosingReminders } from "@/features/notifications/services/triggers";

/** Route Cron quotidienne (/api/cron/reminders) protégée par CRON_SECRET. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const result = await sendClosingReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron:reminders] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des rappels." },
      { status: 500 }
    );
  }
}
