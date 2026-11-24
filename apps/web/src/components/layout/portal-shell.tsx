"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  QrCode,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export type NavIconName =
  | "dashboard"
  | "file"
  | "payment"
  | "documents"
  | "calendar"
  | "home"
  | "qr"
  | "stats"
  | "fraud";

const ICON_MAP = {
  dashboard: LayoutDashboard,
  file: GraduationCap,
  payment: CreditCard,
  documents: FileText,
  calendar: Calendar,
  home: Home,
  qr: QrCode,
  stats: BarChart3,
  fraud: AlertTriangle,
} satisfies Record<NavIconName, React.ComponentType<{ className?: string }>>;

export interface PortalNavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: NavIconName;
}

interface PortalShellProps {
  spaceTitle: string;
  roleLabel: string;
  userName: string;
  userEmail: string;
  navItems: PortalNavItem[];
  children: React.ReactNode;
}

/**
 * Coquille applicative minimaliste pour les espaces étudiant, agent et admin :
 * barre latérale fine sur desktop, en-tête utilisateur et barre basse sur mobile.
 */
export function PortalShell({
  spaceTitle,
  roleLabel,
  userName,
  userEmail,
  navItems,
  children,
}: PortalShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barre latérale fine sur desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/80 bg-surface md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border/80 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight text-foreground">
              SmartInscription
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {spaceTitle}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Navigation principale">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Colonne principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tête commun avec nom, rôle et déconnexion */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-surface/95 px-4 backdrop-blur-sm md:px-8">
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">{spaceTitle}</span>
          </div>

          <div className="hidden text-sm font-medium text-muted-foreground md:block">
            {spaceTitle}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {roleLabel}
            </Badge>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl px-3 text-xs font-medium"
              >
                <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-10">{children}</main>
      </div>

      {/* Barre basse mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border/80 bg-surface/95 px-1 backdrop-blur-sm md:hidden"
        aria-label="Navigation mobile"
      >
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
                isActive ? "text-brand" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-[72px] truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
