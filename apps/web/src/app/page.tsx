import Link from "next/link";
import { REGISTRATION_FEE_FCFA } from "@smartinscription/shared";
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  Smartphone,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const formattedFee = REGISTRATION_FEE_FCFA.toLocaleString("fr-FR");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* En-tête 56 px */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <BrandLogo className="h-8 w-8 shrink-0" />
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              SmartInscription IA
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/connexion"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg px-2.5 sm:px-3")}
            >
              Connexion
            </Link>
            <Link
              href="/inscription"
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-lg bg-brand px-3 text-brand-foreground hover:bg-brand-dark"
              )}
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-16">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <Badge
              variant="secondary"
              className="rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground"
            >
              Inscriptions universitaires au Sénégal
            </Badge>

            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              Payez et gérez votre inscription universitaire en toute simplicité
            </h1>

            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Réglez vos frais d&apos;inscription ({formattedFee} FCFA), déposez vos pièces
              justificatives, obtenez votre reçu numérique avec QR code et prenez rendez-vous en
              ligne.
            </p>

            <div className="flex flex-col justify-center gap-2.5 pt-2 sm:flex-row sm:gap-3">
              <Link
                href="/inscription"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "w-full rounded-lg bg-brand px-5 text-sm font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto"
                )}
              >
                Commencer mon inscription
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/connexion"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "w-full rounded-lg bg-surface px-5 text-sm font-medium sm:w-auto"
                )}
              >
                Se connecter
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4">
            <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
              <CardHeader className="space-y-2.5 p-5 pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Smartphone className="h-[18px] w-[18px]" />
                </div>
                <CardTitle className="text-base font-semibold">Paiement Mobile Money</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-[13px] leading-relaxed text-muted-foreground">
                Orange Money, Wave, Free Money, Wizall ou carte bancaire pour les {formattedFee}{" "}
                FCFA de frais.
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
              <CardHeader className="space-y-2.5 p-5 pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <QrCode className="h-[18px] w-[18px]" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Reçu numérique & QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-[13px] leading-relaxed text-muted-foreground">
                Reçu instantané vérifiable sur place par un agent via scan du QR code.
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
              <CardHeader className="space-y-2.5 p-5 pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                </div>
                <CardTitle className="text-base font-semibold">Suivi de dossier</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-[13px] leading-relaxed text-muted-foreground">
                Téléversement des pièces, prise de rendez-vous et notifications en temps réel.
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row md:px-6">
          <span>© {new Date().getFullYear()} SmartInscription IA</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/confidentialite" className="font-medium text-foreground hover:underline">
              Politique de confidentialité
            </Link>
            <Link href="/connexion" className="hover:underline">
              Connexion
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
