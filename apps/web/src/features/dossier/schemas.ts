import { ACADEMIC_LEVELS } from "@smartinscription/shared";
import { z } from "zod";

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
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
