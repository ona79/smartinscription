import Link from "next/link";
import { REGISTRATION_FEE_FCFA } from "@smartinscription/shared";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  QrCode,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const formattedFee = REGISTRATION_FEE_FCFA.toLocaleString("fr-FR");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* En-tête sobre */}
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              SmartInscription IA
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/connexion"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-xl")}
            >
              Connexion
            </Link>
            <Link
              href="/inscription"
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-xl bg-brand text-brand-foreground hover:bg-brand-dark"
              )}
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Section héro sobre */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-24">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <Badge
              variant="secondary"
              className="rounded-full bg-accent px-3.5 py-1 text-xs font-medium text-accent-foreground"
            >
              Inscriptions universitaires au Sénégal
            </Badge>

            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl sm:leading-[1.12]">
              Payez et gérez votre inscription universitaire en toute simplicité
            </h1>

            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              Réglez vos frais d&apos;inscription ({formattedFee} FCFA), déposez vos pièces
              justificatives, obtenez votre reçu numérique avec QR code et prenez rendez-vous en
              ligne.
            </p>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/inscription"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
                )}
              >
                Commencer mon inscription
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/connexion"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 rounded-xl bg-surface px-6 text-sm font-semibold"
                )}
              >
                Se connecter
              </Link>
            </div>
          </div>

          {/* 3 cartes de bénéfices alignées */}
          <div className="mt-16 grid gap-5 sm:grid-cols-3">
            <Card className="border-border/80 bg-surface shadow-none">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Smartphone className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Paiement Mobile Money</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                Orange Money, Wave, Free Money, Wizall ou carte bancaire pour les {formattedFee}{" "}
                FCFA de frais.
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-surface shadow-none">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <QrCode className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Reçu numérique & QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                Reçu instantané vérifiable sur place par un agent via scan du QR code.
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-surface shadow-none">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Suivi de dossier</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                Téléversement des pièces, prise de rendez-vous et notifications en temps réel.
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/80 bg-surface py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} SmartInscription IA</span>
          <span>Plateforme de paiement et de gestion des inscriptions universitaires</span>
        </div>
      </footer>
    </div>
  );
}
