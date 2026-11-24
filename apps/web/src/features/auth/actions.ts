"use server";

import { ROLE_DEFAULT_ROUTES, ROLES } from "@smartinscription/shared";
import { redirect } from "next/navigation";
import { z } from "zod";
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

  // Force toujours le rôle STUDENT lors d'une inscription publique
  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { email, nom, prenom, telephone: telephone || null },
    create: {
      id: data.user.id,
      email,
      nom,
      prenom,
      telephone: telephone || null,
      role: ROLES.STUDENT,
    },
  });

  if (!data.session) {
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
