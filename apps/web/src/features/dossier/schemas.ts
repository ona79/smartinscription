import { ACADEMIC_LEVELS } from "@smartinscription/shared";
import { z } from "zod";

export const birthFieldsSchema = {
  birthDate: z
    .string()
    .trim()
    .min(1, "Veuillez renseigner votre date de naissance.")
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "Date de naissance invalide.",
    }),
  birthPlace: z
    .string()
    .trim()
    .min(2, "Le lieu de naissance doit contenir au moins 2 caractères.")
    .max(80, "Le lieu de naissance ne peut pas dépasser 80 caractères."),
  nationality: z
    .string()
    .trim()
    .min(2, "La nationalité doit contenir au moins 2 caractères.")
    .max(60, "La nationalité ne peut pas dépasser 60 caractères."),
};

export const completeProfileSchema = z.object({
  numeroEtudiant: z
    .string()
    .trim()
    .min(4, "Le numéro étudiant doit contenir au moins 4 caractères.")
    .max(32, "Le numéro étudiant ne peut pas dépasser 32 caractères.")
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Le numéro étudiant ne doit contenir que des lettres, chiffres ou tirets."
    ),
  ufrId: z.string().min(1, "Veuillez sélectionner une UFR."),
  filiereId: z.string().min(1, "Veuillez sélectionner une filière."),
  niveau: z.enum(ACADEMIC_LEVELS, {
    message: "Veuillez sélectionner un niveau valide (L1 à M2).",
  }),
  ...birthFieldsSchema,
});

export const updateBirthInfoSchema = z.object(birthFieldsSchema);

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type UpdateBirthInfoInput = z.infer<typeof updateBirthInfoSchema>;
