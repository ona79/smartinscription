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
        className="h-7 w-full rounded-lg px-2.5 text-xs sm:w-auto"
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-1.5 h-3 w-3" />
        )}
        Résoudre
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
      className="flex w-full items-center gap-1.5 sm:inline-flex sm:w-auto"
    >
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={defaultRole}
        disabled={isPending}
        aria-label={`Rôle pour ${email}`}
        className="h-8 flex-1 rounded-lg border border-input bg-surface px-2 text-xs sm:flex-none"
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
        className="h-8 shrink-0 rounded-lg px-2.5 text-xs"
      >
        {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        OK
      </Button>
    </form>
  );
}
