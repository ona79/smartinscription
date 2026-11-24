import { ROLE_DEFAULT_ROUTES, type Role } from "@smartinscription/shared";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Retourne l'utilisateur Prisma actuellement authentifié (avec son profil étudiant), ou null. */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      student: {
        include: {
          ufr: true,
          filiere: true,
        },
      },
    },
  });

  return dbUser;
}

/**
 * Vérifie que l'utilisateur courant est authentifié et possède l'un des rôles autorisés.
 * Redirige vers /connexion ou vers l'espace par défaut de l'utilisateur sinon.
 */
export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(ROLE_DEFAULT_ROUTES[user.role]);
  }

  return user;
}
