import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { RetryConnectionButton } from "@/components/retry-connection-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HorsLignePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 text-center shadow-xs sm:p-6">
        <div className="mx-auto mb-3 flex items-center justify-center">
          <BrandLogo className="h-9 w-9" />
        </div>
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WifiOff className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          Vous êtes hors ligne
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Vérifiez votre connexion internet puis réessayez pour accéder à votre dossier.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <RetryConnectionButton />
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full rounded-lg sm:w-auto"
            )}
          >
            Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
