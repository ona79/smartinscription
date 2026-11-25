import { z } from "zod";
import { MESSAGES } from "@/lib/messages";

/**
 * Numéro sénégalais : +221 suivi de 70, 75, 76, 77 ou 78 et 7 chiffres
 * (espaces tolérés lors de la saisie).
 */
export const SENEGAL_PHONE_DIGITS_REGEX = /^\+221(70|75|76|77|78)\d{7}$/;

/** Normalise un numéro saisi en supprimant les espaces, tirets et points. */
export function normalizeSenegalPhone(raw: string): string {
  return raw.replace(/[\s.-]+/g, "").trim();
}

export function isValidSenegalPhone(raw: string): boolean {
  const normalized = normalizeSenegalPhone(raw);
  return SENEGAL_PHONE_DIGITS_REGEX.test(normalized);
}

export const passwordSchema = z
  .string()
  .min(8, MESSAGES.fields.passwordTooShort);

export const senegalPhoneOptionalSchema = z
  .string()
  .transform((val) => normalizeSenegalPhone(val))
  .refine((val) => val === "" || SENEGAL_PHONE_DIGITS_REGEX.test(val), {
    message: MESSAGES.fields.phoneInvalid,
  });

export const loginSchema = z.object({
  email: z.string().trim().email(MESSAGES.fields.emailInvalid),
  password: z.string().min(1, MESSAGES.fields.required),
});

export const registerSchema = z
  .object({
    prenom: z.string().trim().min(2, "Le prénom doit contenir au moins 2 caractères."),
    nom: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
    telephone: senegalPhoneOptionalSchema.optional().default(""),
    email: z.string().trim().email(MESSAGES.fields.emailInvalid),
    password: passwordSchema,
    confirmPassword: z.string().min(1, MESSAGES.fields.required),
    acceptPrivacy: z.literal("on", {
      message: MESSAGES.auth.privacyRequired,
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: MESSAGES.auth.passwordMismatch,
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(MESSAGES.fields.emailInvalid),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, MESSAGES.fields.required),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: MESSAGES.auth.passwordMismatch,
    path: ["confirmPassword"],
  });
