import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 text-center shadow-xs sm:p-6">
        <div className="mx-auto mb-3 flex items-center justify-center">
          <BrandLogo className="h-9 w-9" />
        </div>
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          {MESSAGES.errorPage.notFoundTitle}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {MESSAGES.errorPage.notFoundDescription}
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
            )}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {MESSAGES.errorPage.back}
          </Link>
        </div>
      </div>
    </main>
  );
}
