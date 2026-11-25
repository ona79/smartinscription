import { REGISTRATION_STATUSES, type RegistrationStatus } from "@smartinscription/shared";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegistrationStepperProps {
  hasProfile: boolean;
  status: RegistrationStatus | null;
}

/**
 * Stepper des 4 étapes de l'inscription :
 * - sur mobile (< sm) : 4 pastilles reliées par une ligne sur une rangée (~56 px) + nom de l'étape en cours dessous ;
 * - sur desktop (≥ sm) : 4 cartes compactes (48 px).
 */
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

  const currentStep =
    steps.find((s) => s.active) ?? steps[steps.length - 1];

  return (
    <>
      {/* Mobile : 4 pastilles reliées sur une seule rangée + libellé de l'étape en cours */}
      <div className="space-y-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 sm:hidden">
        <div className="flex h-7 items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.label} className="flex flex-1 items-center last:flex-none">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-brand text-brand-foreground"
                    : step.active
                      ? "border-2 border-brand bg-surface text-brand"
                      : "border border-border bg-surface text-muted-foreground"
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-1.5 h-0.5 flex-1 rounded-full",
                    step.done ? "bg-brand" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-xs font-medium text-foreground">
          Étape en cours : <span className="text-brand">{currentStep.label}</span>
        </p>
      </div>

      {/* Desktop / Tablette */}
      <ol className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
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
    </>
  );
}
