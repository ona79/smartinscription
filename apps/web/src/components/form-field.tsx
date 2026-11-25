"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.ComponentProps<"input"> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  hint?: string;
  error?: string;
}

/** Champ de formulaire réutilisable avec label lié, icône, aide et message d'erreur. */
export function FormField({
  id,
  label,
  icon,
  trailing,
  hint,
  error,
  className,
  ...props
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label}
      </Label>

      <div className="relative flex items-center">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 flex items-center text-muted-foreground"
          >
            {icon}
          </span>
        )}

        <Input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "h-11 rounded-lg bg-surface text-base sm:h-10 sm:text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/30",
            icon && "pl-9",
            trailing && "pr-9",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            className
          )}
          {...props}
        />

        {trailing && <div className="absolute right-2 flex items-center">{trailing}</div>}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p id={errorId} className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
