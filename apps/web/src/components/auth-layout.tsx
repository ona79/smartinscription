import Link from "next/link";
import { ArrowLeft, CheckCircle2, QrCode, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Mise en page partagée pour les écrans d'authentification (/connexion, /inscription, /mot-de-passe-oublie) :
 * panneau de marque en vert profond à gauche (desktop) et formulaire compact en 1 colonne sur mobile (dvh).
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-12">
      {/* Panneau de marque (masqué sur mobile < lg) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--brand-dark)] via-[#0b5e57] to-[var(--brand)] p-8 text-white lg:col-span-5 lg:flex xl:p-12">
        <svg
          aria-hidden="true"
          viewBox="0 0 600 800"
          fill="none"
          className="pointer-events-none absolute -right-24 -bottom-24 h-[520px] w-[520px] opacity-15"
        >
          <path
            d="M420 40C510 110 580 220 560 350C540 480 430 520 390 620C350 720 260 790 150 760C40 730 -20 610 15 480C50 350 150 310 190 200C230 90 330 -30 420 40Z"
            fill="currentColor"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          fill="none"
          className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 opacity-10"
        >
          <circle cx="200" cy="200" r="180" fill="currentColor" />
        </svg>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <BrandLogo variant="light" className="h-9 w-9 backdrop-blur-sm" />
            <div>
              <span className="block text-sm font-semibold tracking-tight">SmartInscription IA</span>
              <span className="block text-xs text-white/75">Portail universitaire</span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="space-y-2.5">
            <h2 className="text-2xl font-semibold leading-snug tracking-tight">
              Votre inscription universitaire, simple et sécurisée.
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              Réglez vos frais d&apos;inscription de 25 000 FCFA, déposez vos pièces et obtenez
              votre reçu numérique vérifiable par QR code.
            </p>
          </div>

          <ul className="space-y-2.5 text-[13px] text-white/90">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-200" />
              <span>Paiement Mobile Money (Wave, Orange Money, Free, Wizall)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <QrCode className="h-4 w-4 shrink-0 text-teal-200" />
              <span>Reçu numérique instantané avec QR code sécurisé</span>
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-200" />
              <span>Suivi en temps réel de votre dossier et rendez-vous</span>
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/65">
          © {new Date().getFullYear()} SmartInscription IA — Sénégal
        </p>
      </aside>

      {/* Zone formulaire */}
      <main className="flex flex-col justify-center bg-surface px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8 lg:col-span-7 lg:px-14">
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 lg:hidden">
              <BrandLogo className="h-8 w-8 shrink-0" />
              <span className="text-sm font-semibold tracking-tight">SmartInscription IA</span>
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:min-h-9"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Accueil</span>
            </Link>
          </div>

          <div className="space-y-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
