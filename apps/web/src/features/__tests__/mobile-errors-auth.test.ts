import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  isValidSenegalPhone,
  normalizeSenegalPhone,
  passwordSchema,
  registerSchema,
} from "@/features/auth/schemas";
import { notifyActionResult } from "@/hooks/use-action-toast";
import {
  actionError,
  actionOk,
  actionValidationError,
} from "@/lib/action-result";
import { AppError, toActionError } from "@/lib/app-error";
import { MESSAGES } from "@/lib/messages";

describe("Convention ActionResult & hook notifyActionResult", () => {
  it("affiche un toast de succès pour actionOk et un toast d'erreur pour actionError", () => {
    const api = { success: vi.fn(), error: vi.fn() };

    notifyActionResult(actionOk(MESSAGES.photo.success), {}, api);
    expect(api.success).toHaveBeenCalledWith(MESSAGES.photo.success);
    expect(api.error).not.toHaveBeenCalled();

    notifyActionResult(
      actionError(MESSAGES.documents.invalidFormat, { file: MESSAGES.documents.invalidFormat }),
      {},
      api
    );
    expect(api.error).toHaveBeenCalledWith(MESSAGES.documents.invalidFormat);
  });

  it("n'affiche pas de toast de succès quand silentSuccess est actif (anti-doublon cloche)", () => {
    const api = { success: vi.fn(), error: vi.fn() };
    const shown = notifyActionResult(
      actionOk(MESSAGES.notifications.markedRead),
      { silentSuccess: true },
      api
    );
    expect(shown).toBeNull();
    expect(api.success).not.toHaveBeenCalled();
  });

  it("convertit une erreur Zod en fieldErrors par champ", () => {
    const schema = z.object({
      email: z.string().email(MESSAGES.fields.emailInvalid),
      birthPlace: z.string().min(2, MESSAGES.fields.birthPlaceInvalid),
    });
    const parsed = schema.safeParse({ email: "bad", birthPlace: "A" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const res = actionValidationError(parsed.error);
      expect(res.ok).toBe(false);
      expect(res.error).toBe(MESSAGES.generic.formInvalid);
      expect(res.fieldErrors).toEqual({
        email: MESSAGES.fields.emailInvalid,
        birthPlace: MESSAGES.fields.birthPlaceInvalid,
      });
    }
  });

  it("masque les erreurs techniques derrière une référence support et conserve AppError", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tech = toActionError(new Error("SQLite/Postgres relation Foo failed"), "test.ctx");
    expect(tech.ok).toBe(false);
    expect(tech.error).toMatch(/ERR-[A-Z0-9]{6}/);
    expect(tech.error).not.toContain("Postgres");
    spy.mockRestore();

    const biz = toActionError(new AppError(MESSAGES.photo.tooLarge), "test.ctx");
    expect(biz).toEqual({ ok: false, error: MESSAGES.photo.tooLarge });
  });
});

describe("Messages d'erreur d'envoi de fichier (photo & documents)", () => {
  it("contient tous les messages français utilisateur sans fuite technique", () => {
    const requiredKeys = [
      MESSAGES.photo.success,
      MESSAGES.photo.invalidFormat,
      MESSAGES.photo.tooLarge,
      MESSAGES.photo.unreadable,
      MESSAGES.photo.network,
      MESSAGES.photo.providerFailed,
      MESSAGES.photo.cancelled,
      MESSAGES.documents.uploadSuccess,
      MESSAGES.documents.replaceSuccess,
      MESSAGES.documents.deleteSuccess,
      MESSAGES.documents.pdfTooLarge,
      MESSAGES.documents.tooLarge,
      MESSAGES.documents.network,
    ];
    for (const msg of requiredKeys) {
      expect(msg.length).toBeGreaterThan(5);
      expect(msg).not.toMatch(/prisma|cloudinary|supabase|sql|http \d{3}/i);
    }
  });
});

describe("StudentCard compacte & responsive aux petites largeurs", () => {
  const cardSource = readFileSync(
    path.resolve(process.cwd(), "src/features/dossier/components/student-card.tsx"),
    "utf8"
  );

  it("impose max-w-[400px], le rapport ID-1 1.586/1 et une typographie proportionnelle clamp()", () => {
    expect(cardSource).toContain("max-w-[400px]");
    expect(cardSource).toContain("aspect-[1.586/1]");
    expect(cardSource).toContain("@container");
    expect(cardSource).toContain("clamp(");
  });

  it("affiche toujours « Né(e) le — à — » si les informations de naissance manquent", () => {
    expect(cardSource).toContain("Né(e) le ${birthDateLabel} à ${birthPlaceLabel}");
    expect(cardSource).not.toContain('birthDateLabel === "—" && birthPlaceLabel === "—"');
  });
});

describe("Validation inscription : mot de passe 8+ caractères & téléphone sénégalais", () => {
  it("exige 8 caractères minimum pour le mot de passe", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("valide les numéros sénégalais +221 (70/75/76/77/78) en tolérant les espaces", () => {
    expect(isValidSenegalPhone("+221 77 123 45 67")).toBe(true);
    expect(isValidSenegalPhone("+221781234567")).toBe(true);
    expect(isValidSenegalPhone("+221 70 987 65 43")).toBe(true);
    expect(isValidSenegalPhone("+221 75 111 22 33")).toBe(true);
    expect(isValidSenegalPhone("+221 76 444 55 66")).toBe(true);
    expect(normalizeSenegalPhone("+221 77 123 45 67")).toBe("+221771234567");

    expect(isValidSenegalPhone("+221 33 800 00 00")).toBe(false);
    expect(isValidSenegalPhone("+33 6 12 34 56 78")).toBe(false);
    expect(isValidSenegalPhone("77 123 45 67")).toBe(false);
  });

  it("exige l'acceptation de la politique de confidentialité à l'inscription", () => {
    const missingConsent = registerSchema.safeParse({
      prenom: "Cheikh",
      nom: "Fall",
      telephone: "+221 77 123 45 67",
      email: "cheikh@exemple.sn",
      password: "Password123",
      confirmPassword: "Password123",
    });
    expect(missingConsent.success).toBe(false);

    const ok = registerSchema.safeParse({
      prenom: "Cheikh",
      nom: "Fall",
      telephone: "+221 77 123 45 67",
      email: "cheikh@exemple.sn",
      password: "Password123",
      confirmPassword: "Password123",
      acceptPrivacy: "on",
    });
    expect(ok.success).toBe(true);
  });
});

describe("Mot de passe oublié : réponse neutre identique", () => {
  it("renvoie toujours le même message que l'adresse existe ou non", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      isSupabaseConfigured: () => true,
      createClient: async () => ({
        auth: {
          resetPasswordForEmail: async (email: string) => {
            if (email === "inconnu@exemple.sn") {
              return { error: { message: "User not found" } };
            }
            return { error: null };
          },
        },
      }),
    }));

    const { requestPasswordResetAction } = await import("@/features/auth/actions");

    const formKnown = new FormData();
    formKnown.set("email", "connu@exemple.sn");
    const resKnown = await requestPasswordResetAction(null, formKnown);

    const formUnknown = new FormData();
    formUnknown.set("email", "inconnu@exemple.sn");
    const resUnknown = await requestPasswordResetAction(null, formUnknown);

    expect(resKnown).toEqual({
      ok: true,
      message: MESSAGES.auth.forgotPasswordSent,
    });
    expect(resUnknown).toEqual(resKnown);
  });
});
