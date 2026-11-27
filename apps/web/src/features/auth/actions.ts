"use server";

import { ROLE_DEFAULT_ROUTES, ROLES } from "@smartinscription/shared";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordActivity } from "@/features/activity/record-activity";
import {
  getPublicTestAccounts,
  getUnlockedTestAccounts,
  type TestAccountItem,
} from "@/features/auth/lib/test-accounts";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import {
  actionError,
  actionOk,
  actionValidationError,
  type ActionResult,
} from "@/lib/action-result";
import { toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AuthActionState = ActionResult;

// Limiteur en mémoire (3 demandes / 5 min par IP) en complément de Supabase.
const RESET_WINDOW_MS = 5 * 60_000;
const RESET_MAX_ATTEMPTS = 3;
const resetAttempts = new Map<string, number[]>();

function checkPasswordResetRateLimit(key: string, now = Date.now()): boolean {
  const recent = (resetAttempts.get(key) ?? []).filter((t) => now - t < RESET_WINDOW_MS);
  if (recent.length >= RESET_MAX_ATTEMPTS) {
    resetAttempts.set(key, recent);
    return false;
  }
  recent.push(now);
  resetAttempts.set(key, recent);
  return true;
}

export async function loginAction(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return actionError(MESSAGES.generic.unavailable);
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  let targetRoute: string = ROLE_DEFAULT_ROUTES.STUDENT;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return actionError(MESSAGES.auth.invalidCredentials);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { role: true },
    });

    await recordActivity("LOGIN", data.user.id);
    if (dbUser) {
      targetRoute = ROLE_DEFAULT_ROUTES[dbUser.role];
    }
  } catch (error) {
    return toActionError(error, "auth.login");
  }

  redirect(targetRoute);
}

export async function registerAction(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return actionError(MESSAGES.generic.unavailable);
  }

  const parsed = registerSchema.safeParse({
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    telephone: formData.get("telephone") ?? "",
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptPrivacy: formData.get("acceptPrivacy"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  const { email, password, nom, prenom, telephone } = parsed.data;
  let hasSession = false;

  try {
    const supabase = await createClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let createdUserId: string;

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
        const alreadyExists = /already|exists|registered/i.test(
          adminError?.message ?? ""
        );
        return actionError(
          alreadyExists ? MESSAGES.auth.emailAlreadyUsed : MESSAGES.auth.registerFailed,
          alreadyExists ? { email: MESSAGES.auth.emailAlreadyUsed } : undefined
        );
      }

      createdUserId = adminData.user.id;

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
        const alreadyExists = /already|exists|registered/i.test(error?.message ?? "");
        return actionError(
          alreadyExists ? MESSAGES.auth.emailAlreadyUsed : MESSAGES.auth.registerFailed
        );
      }

      createdUserId = data.user.id;
      hasSession = Boolean(data.session);
    }

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
  } catch (error) {
    return toActionError(error, "auth.register");
  }

  if (!hasSession) {
    return actionOk(MESSAGES.auth.registerSuccess);
  }

  redirect(ROLE_DEFAULT_ROUTES.STUDENT);
}

/**
 * Demande de réinitialisation de mot de passe via Supabase Auth.
 * Retourne TOUJOURS le même message neutre que l'adresse existe ou non.
 */
export async function requestPasswordResetAction(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkPasswordResetRateLimit(`${ip}:${parsed.data.email.toLowerCase()}`)) {
    return actionError(MESSAGES.generic.rateLimited);
  }

  if (isSupabaseConfigured()) {
    try {
      const appUrl = (
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3001"
      ).replace(/\/$/, "");
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${appUrl}/reinitialiser-mot-de-passe`,
      });
    } catch (error) {
      // On journalise côté serveur mais on ne révèle jamais l'existence du compte.
      console.error("[auth.forgotPassword]", error);
    }
  }

  return actionOk(MESSAGES.auth.forgotPasswordSent);
}

/** Définit un nouveau mot de passe après ouverture du lien Supabase de réinitialisation. */
export async function updatePasswordAction(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return actionError(MESSAGES.generic.unavailable);
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return actionValidationError(parsed.error);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return actionError(MESSAGES.auth.resetPasswordInvalid);
    }

    return actionOk(MESSAGES.auth.resetPasswordSuccess);
  } catch (error) {
    return toActionError(error, "auth.resetPassword");
  }
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/connexion");
}

export type { TestAccountItem };

/** Retourne les comptes de test sans code d'accès (ENABLE_TEST_ACCOUNTS=true uniquement). */
export async function listTestAccountsAction(): Promise<{
  ok: boolean;
  accounts?: TestAccountItem[];
  error?: string;
}> {
  return getPublicTestAccounts();
}

/** Vérifie le code d'accès et retourne les comptes de test (ENABLE_TEST_ACCOUNTS=true uniquement). */
export async function unlockTestAccountsAction(passcode: string): Promise<{
  ok: boolean;
  accounts?: TestAccountItem[];
  error?: string;
}> {
  return getUnlockedTestAccounts(passcode);
}
