import Link from "next/link";
import { Clock, LogIn } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

export default function SessionExpireePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 text-center shadow-xs sm:p-6">
        <div className="mx-auto mb-3 flex items-center justify-center">
          <BrandLogo className="h-9 w-9" />
        </div>
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Clock className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          Session expirée
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {MESSAGES.generic.sessionExpired}
        </p>
        <div className="mt-5">
          <Link
            href="/connexion"
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
            )}
          >
            <LogIn className="mr-1.5 h-4 w-4" />
            Me reconnecter
          </Link>
        </div>
      </div>
    </main>
  );
}
