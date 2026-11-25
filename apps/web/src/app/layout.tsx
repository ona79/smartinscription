import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { RegisterSW } from "@/components/pwa/register-sw";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartInscription IA — Inscriptions universitaires",
  description:
    "Plateforme web et mobile de paiement et de gestion des inscriptions universitaires au Sénégal.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
    apple: "/branding/logo_uasz.png",
  },
  openGraph: {
    title: "SmartInscription IA — Inscriptions universitaires",
    description:
      "Payez vos frais, déposez vos pièces et suivez votre dossier universitaire en ligne.",
    type: "website",
    locale: "fr_SN",
    siteName: "SmartInscription IA",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartInscription",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster richColors position="top-center" />
        <RegisterSW />
      </body>
    </html>
  );
}
