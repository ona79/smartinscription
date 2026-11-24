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
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>

      <div className="relative flex items-center">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 flex items-center text-muted-foreground"
          >
            {icon}
          </span>
        )}

        <Input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "h-11 rounded-xl bg-surface text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/30",
            icon && "pl-10",
            trailing && "pr-10",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            className
          )}
          {...props}
        />

        {trailing && <div className="absolute right-2.5 flex items-center">{trailing}</div>}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
