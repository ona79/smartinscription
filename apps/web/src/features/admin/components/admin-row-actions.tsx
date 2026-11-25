"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { ROLES } from "@smartinscription/shared";
import { Button } from "@/components/ui/button";
import { resolveFraudAlertAction, updateUserRoleAction } from "@/features/admin/actions";
import { useFormActionToast } from "@/hooks/use-action-toast";

export function ResolveFraudAlertButton({ alertId }: { alertId: string }) {
  const { formAction, isPending } = useFormActionToast(resolveFraudAlertAction);

  return (
    <form action={formAction} className="w-full sm:w-auto">
      <input type="hidden" name="alertId" value={alertId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={isPending}
        className="w-full rounded-lg text-[13px] sm:w-auto"
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        )}
        Marquer comme résolue
      </Button>
    </form>
  );
}

export function UpdateUserRoleForm({
  userId,
  email,
  defaultRole,
}: {
  userId: string;
  email: string;
  defaultRole: string;
}) {
  const { formAction, isPending } = useFormActionToast(updateUserRoleAction);

  return (
    <form
      action={formAction}
      className="flex w-full items-center gap-2 sm:inline-flex sm:w-auto"
    >
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={defaultRole}
        disabled={isPending}
        aria-label={`Rôle pour ${email}`}
        className="h-11 flex-1 rounded-lg border border-input bg-surface px-2.5 text-base sm:h-9 sm:flex-none sm:text-[13px]"
      >
        <option value={ROLES.STUDENT}>Étudiant</option>
        <option value={ROLES.AGENT}>Agent</option>
        <option value={ROLES.ADMIN}>Administrateur</option>
      </select>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={isPending}
        className="shrink-0 rounded-lg text-[13px]"
      >
        {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Appliquer
      </Button>
    </form>
  );
}
