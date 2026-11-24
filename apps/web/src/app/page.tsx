import Link from "next/link";
import { REGISTRATION_FEE_FCFA } from "@smartinscription/shared";
import { ArrowRight, CheckCircle2, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const formattedFee = REGISTRATION_FEE_FCFA.toLocaleString("fr-FR");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-teal-700" />
            <span className="font-bold tracking-tight">SmartInscription IA</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/connexion" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Connexion
            </Link>
            <Link
              href="/inscription"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-teal-700 text-white hover:bg-teal-800"
              )}
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-12 md:py-20">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <Badge variant="secondary" className="px-3 py-1">
              Inscriptions universitaires au Sénégal
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Payez et gérez votre inscription universitaire en toute simplicité
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Réglez vos frais d&apos;inscription ({formattedFee} FCFA), déposez vos pièces
              justificatives, obtenez votre reçu numérique avec QR code et prenez rendez-vous en
              ligne.
            </p>
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/inscription"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-teal-700 text-white hover:bg-teal-800"
                )}
              >
                Commencer mon inscription
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/connexion"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Se connecter
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <Smartphone className="h-6 w-6 text-teal-700" />
                <CardTitle className="text-base">Paiement Mobile Money</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Orange Money, Wave, Free Money, Wizall ou carte bancaire pour les {formattedFee}{" "}
                FCFA de frais.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <QrCode className="h-6 w-6 text-teal-700" />
                <CardTitle className="text-base">Reçu numérique & QR Code</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Reçu instantané vérifiable sur place par un agent via scan du QR code.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle2 className="h-6 w-6 text-teal-700" />
                <CardTitle className="text-base">Suivi de dossier</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Téléversement des pièces, prise de rendez-vous et notifications en temps réel.
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        SmartInscription IA — Socle technique Phase 0
      </footer>
    </div>
  );
}
