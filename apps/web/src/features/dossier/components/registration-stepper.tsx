import { REGISTRATION_STATUSES, type RegistrationStatus } from "@smartinscription/shared";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegistrationStepperProps {
  hasProfile: boolean;
  status: RegistrationStatus | null;
}

/** Stepper compact (48 px de haut, pastilles 24 px) des 4 étapes de l'inscription. */
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
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={cn(
            "flex h-12 items-center gap-2.5 rounded-xl border px-3.5 transition-colors",
            step.done
              ? "border-brand/30 bg-accent/60"
              : step.active
                ? "border-brand bg-surface"
                : "border-border bg-surface opacity-70"
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              step.done
                ? "bg-brand text-brand-foreground"
                : step.active
                  ? "border-2 border-brand text-brand"
                  : "border border-border text-muted-foreground"
            )}
          >
            {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </span>
          <span className="truncate text-[13px] font-medium text-foreground">
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
