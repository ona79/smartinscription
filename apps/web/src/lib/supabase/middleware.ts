import { ROLE_DEFAULT_ROUTES, ROLES, type Role } from "@smartinscription/shared";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES: { prefix: string; allowedRoles: Role[] }[] = [
  { prefix: "/etudiant", allowedRoles: [ROLES.STUDENT] },
  { prefix: "/agent", allowedRoles: [ROLES.AGENT, ROLES.ADMIN] },
  { prefix: "/admin", allowedRoles: [ROLES.ADMIN] },
];

const AUTH_ROUTES = ["/connexion", "/inscription"];

function resolveRoleFromMetadata(
  appMeta: Record<string, unknown> | undefined,
  userMeta: Record<string, unknown> | undefined
): Role {
  const raw = appMeta?.role ?? userMeta?.role;
  if (raw === ROLES.ADMIN || raw === ROLES.AGENT || raw === ROLES.STUDENT) {
    return raw;
  }
  return ROLES.STUDENT;
}

/** Rafraîchit le cookie de session Supabase et applique la protection des routes par rôle. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  const matchedProtected = PROTECTED_PREFIXES.find((entry) =>
    pathname.startsWith(entry.prefix)
  );

  // Gère proprement l'absence de configuration Supabase en local (Phase 0)
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("[YOUR-PROJECT-REF]")) {
    if (matchedProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/connexion";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && matchedProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = resolveRoleFromMetadata(user.app_metadata, user.user_metadata);

    if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_DEFAULT_ROUTES[role];
      return NextResponse.redirect(url);
    }

    if (matchedProtected && !matchedProtected.allowedRoles.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_DEFAULT_ROUTES[role];
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
