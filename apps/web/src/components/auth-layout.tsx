import Link from "next/link";
import { ArrowLeft, CheckCircle2, GraduationCap, QrCode, ShieldCheck } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Mise en page partagée pour les écrans d'authentification (/connexion, /inscription) :
 * panneau de marque en vert profond à gauche (desktop) et formulaire compact à droite.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-12">
      {/* Panneau de marque (masqué sur mobile) */}
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
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
      <main className="flex flex-col justify-center bg-surface px-4 py-8 sm:px-8 lg:col-span-7 lg:px-14">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight">SmartInscription IA</span>
            </Link>

            <Link
              href="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour à l&apos;accueil</span>
            </Link>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
