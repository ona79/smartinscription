import { cache } from "react";
import { ROLE_DEFAULT_ROUTES, type Role } from "@smartinscription/shared";
import { redirect } from "next/navigation";
import { measurePerf } from "@/lib/perf";
import { prisma } from "@/lib/prisma";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Retourne l'utilisateur Prisma actuellement authentifié (mémoïsé par requête via React.cache), ou null. */
export const getCurrentUser = cache(async () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await measurePerf("auth", "getCurrentUser:supabase.getUser", () =>
    supabase.auth.getUser()
  );

  if (error || !authUser) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      telephone: true,
      role: true,
    },
  });

  return dbUser;
});

/**
 * Vérifie que l'utilisateur courant est authentifié et possède l'un des rôles autorisés.
 * Redirige vers /connexion ou vers l'espace par défaut de l'utilisateur sinon.
 */
export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion?raison=session-expiree");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(`${ROLE_DEFAULT_ROUTES[user.role]}?raison=acces-refuse`);
  }

  return user;
}
