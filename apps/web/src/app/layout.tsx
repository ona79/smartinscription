import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/pwa/register-sw";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartInscription IA — Inscriptions universitaires",
  description:
    "Plateforme web et mobile de paiement et de gestion des inscriptions universitaires au Sénégal.",
  manifest: "/manifest.webmanifest",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster richColors position="top-center" />
        <RegisterSW />
      </body>
    </html>
  );
}
