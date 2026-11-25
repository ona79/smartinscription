import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Convention Next.js 16 : point d'entrée réseau remplaçant middleware.ts. */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
