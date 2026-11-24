import { REGISTRATION_STATUSES, type RegistrationStatus } from "@smartinscription/shared";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegistrationStepperProps {
  hasProfile: boolean;
  status: RegistrationStatus | null;
}

/** Stepper de progression des 4 grandes étapes de l'inscription étudiante. */
export function RegistrationStepper({ hasProfile, status }: RegistrationStepperProps) {
  const isPaid =
    status === REGISTRATION_STATUSES.PAID ||
    status === REGISTRATION_STATUSES.DOCS_INCOMPLETE ||
    status === REGISTRATION_STATUSES.DOCS_COMPLETE ||
    status === REGISTRATION_STATUSES.VALIDATED;

  const hasDocs =
    status === REGISTRATION_STATUSES.DOCS_COMPLETE ||
    status === REGISTRATION_STATUSES.VALIDATED;

  const isValidated = status === REGISTRATION_STATUSES.VALIDATED;

  const steps = [
    { label: "Profil académique", done: hasProfile, active: !hasProfile },
    {
      label: "Paiement (25 000 FCFA)",
      done: isPaid,
      active: hasProfile && !isPaid,
    },
    {
      label: "Pièces justificatives",
      done: hasDocs,
      active: isPaid && !hasDocs,
    },
    {
      label: "Validation finale",
      done: isValidated,
      active: hasDocs && !isValidated,
    },
  ];

  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-4 transition-colors",
            step.done
              ? "border-brand/30 bg-accent/60"
              : step.active
                ? "border-brand bg-surface"
                : "border-border/80 bg-surface opacity-70"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              step.done
                ? "bg-brand text-brand-foreground"
                : step.active
                  ? "border-2 border-brand text-brand"
                  : "border border-border text-muted-foreground"
            )}
          >
            {step.done ? <Check className="h-4 w-4" /> : index + 1}
          </span>
          <span className="text-xs font-semibold leading-tight text-foreground">
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
