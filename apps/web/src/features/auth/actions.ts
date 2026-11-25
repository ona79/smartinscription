"use server";

import { ROLE_DEFAULT_ROUTES, ROLES } from "@smartinscription/shared";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordActivity } from "@/features/activity/record-activity";
import {
  getUnlockedTestAccounts,
  type TestAccountItem,
} from "@/features/auth/lib/test-accounts";
import { prisma } from "@/lib/prisma";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface AuthActionState {
  error?: string;
  success?: string;
}

const loginSchema = z.object({
  email: z.string().email("Veuillez saisir une adresse e-mail valide."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

const registerSchema = z
  .object({
    prenom: z.string().trim().min(2, "Le prénom doit contenir au moins 2 caractères."),
    nom: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
    telephone: z
      .string()
      .trim()
      .min(8, "Veuillez saisir un numéro de téléphone valide.")
      .optional()
      .or(z.literal("")),
    email: z.string().trim().email("Veuillez saisir une adresse e-mail valide."),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase n'est pas encore configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Identifiants invalides." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "E-mail ou mot de passe incorrect." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true },
  });

  await recordActivity("LOGIN", data.user.id);

  const targetRoute = dbUser ? ROLE_DEFAULT_ROUTES[dbUser.role] : ROLE_DEFAULT_ROUTES.STUDENT;
  redirect(targetRoute);
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase n'est pas encore configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.",
    };
  }

  const parsed = registerSchema.safeParse({
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    telephone: formData.get("telephone"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { email, password, nom, prenom, telephone } = parsed.data;
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let createdUserId: string | null = null;
  let hasSession = false;

  // En local / sans validation e-mail : crée l'utilisateur déjà confirmé via la clé service role
  if (supabaseUrl && serviceRoleKey) {
    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminData, error: adminError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nom,
          prenom,
          role: ROLES.STUDENT,
        },
      });

    if (adminError || !adminData.user) {
      return {
        error:
          adminError?.message ??
          "Impossible de créer le compte. Vérifiez si cet e-mail n'est pas déjà utilisé.",
      };
    }

    createdUserId = adminData.user.id;

    // Connecte immédiatement l'utilisateur pour poser le cookie de session
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (!signInError && signInData.session) {
      hasSession = true;
    }
  } else {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          prenom,
          role: ROLES.STUDENT,
        },
      },
    });

    if (error || !data.user) {
      return {
        error: error?.message ?? "Impossible de créer le compte. Veuillez réessayer.",
      };
    }

    createdUserId = data.user.id;
    hasSession = Boolean(data.session);
  }

  // Force toujours le rôle STUDENT lors d'une inscription publique
  await prisma.user.upsert({
    where: { id: createdUserId },
    update: { email, nom, prenom, telephone: telephone || null },
    create: {
      id: createdUserId,
      email,
      nom,
      prenom,
      telephone: telephone || null,
      role: ROLES.STUDENT,
    },
  });

  if (!hasSession) {
    return {
      success:
        "Compte créé ! Vérifiez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.",
    };
  }

  redirect(ROLE_DEFAULT_ROUTES.STUDENT);
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/connexion");
}

export type { TestAccountItem };

/** Vérifie le code d'accès et retourne les comptes de test (dev + ENABLE_TEST_ACCOUNTS=true uniquement). */
export async function unlockTestAccountsAction(passcode: string): Promise<{
  ok: boolean;
  accounts?: TestAccountItem[];
  error?: string;
}> {
  return getUnlockedTestAccounts(passcode);
}
