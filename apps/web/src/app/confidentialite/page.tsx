import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ConfidentialitePage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <span className="text-sm font-semibold tracking-tight">SmartInscription IA</span>
          </Link>
          <Link
            href="/inscription"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] md:px-6 md:py-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
              Politique de confidentialité
            </h1>
            <p className="text-xs text-muted-foreground">
              Document de référence à relire et valider par l&apos;équipe universitaire.
            </p>
          </div>
        </div>

        <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-base font-semibold">1. Données collectées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-1 text-sm leading-relaxed text-muted-foreground sm:p-5 sm:pt-1">
            <p>
              Dans le cadre de votre inscription universitaire, la plateforme collecte :
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Identité et scolarité</strong> : nom, prénom,
                adresse e-mail, téléphone, date et lieu de naissance, nationalité, numéro étudiant,
                UFR, filière et niveau.
              </li>
              <li>
                <strong className="text-foreground">Pièces justificatives</strong> : photo
                d&apos;identité et documents officiels (carte d&apos;identité, relevés, attestation)
                stockés de manière privée avec accès par URL signée temporaire.
              </li>
              <li>
                <strong className="text-foreground">Paiement</strong> : références de transaction,
                montant et reçu numérique vérifiable par QR code (aucune donnée de carte bancaire ou
                code secret Mobile Money n&apos;est conservée).
              </li>
              <li>
                <strong className="text-foreground">Journaux de sécurité</strong> : connexions,
                actions de validation et vérifications anti-fraude.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-base font-semibold">
              2. Finalité et durée de conservation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-1 text-sm leading-relaxed text-muted-foreground sm:p-5 sm:pt-1">
            <p>
              Vos données sont utilisées uniquement pour instruire votre dossier d&apos;inscription,
              délivrer votre reçu et votre carte étudiante numérique, planifier votre rendez-vous
              et prévenir les doublons ou fraudes.
            </p>
            <p>
              Elles sont conservées pendant la durée de votre scolarité et les délais légaux
              d&apos;archivage universitaire, puis supprimées ou anonymisées.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-base font-semibold">3. Vos droits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-1 text-sm leading-relaxed text-muted-foreground sm:p-5 sm:pt-1">
            <p>
              Vous pouvez consulter et modifier vos informations d&apos;état civil ainsi que vos
              pièces justificatives depuis votre espace tant que le dossier n&apos;est pas validé.
              Pour toute demande d&apos;accès, de rectification ou de suppression, adressez-vous au
              service de la scolarité de l&apos;université.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
