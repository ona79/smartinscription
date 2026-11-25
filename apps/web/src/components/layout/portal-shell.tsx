"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  QrCode,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
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
  unreadNotificationsCount?: number;
  notificationsHref?: string;
  showFaqTrigger?: boolean;
  children: React.ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Coquille applicative compacte pour les espaces étudiant, agent et admin :
 * barre latérale 240 px sur desktop, en-tête 52 px mobile / 56 px desktop et barre basse mobile avec safe-area.
 */
export function PortalShell({
  spaceTitle,
  roleLabel,
  userName,
  userEmail,
  navItems,
  unreadNotificationsCount = 0,
  notificationsHref,
  showFaqTrigger = false,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const initials = getInitials(userName);

  function openMobileFaq() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("smartinscription:open-faq"));
    }
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Barre latérale 240 px sur desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <BrandLogo className="h-8 w-8" />
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
              SmartInscription
            </span>
            <span className="block truncate text-xs text-muted-foreground">
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
                  "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
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
        {/* En-tête 52 px mobile / 56 px desktop */}
        <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur-sm md:h-14 md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <BrandLogo className="h-7 w-7 shrink-0" />
            <span className="truncate text-sm font-semibold tracking-tight">{spaceTitle}</span>
          </div>

          <div className="hidden text-[13px] font-medium text-muted-foreground md:block">
            {spaceTitle}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {notificationsHref && (
              <Link
                href={notificationsHref}
                aria-label={
                  unreadNotificationsCount > 0
                    ? `${unreadNotificationsCount} notifications non lues`
                    : "Notifications"
                }
                title="Notifications"
                className="relative inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-9"
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground sm:top-1 sm:right-1">
                    {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                  </span>
                )}
              </Link>
            )}

            {showFaqTrigger && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openMobileFaq}
                aria-label="Ouvrir l'aide FAQ"
                title="Aide FAQ"
                className="text-muted-foreground hover:text-foreground md:hidden"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}

            <div
              title={userEmail}
              className="flex items-center gap-2 rounded-lg px-1 py-1"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-accent-foreground">
                {initials}
              </span>
              <span
                title={userName}
                className="hidden max-w-[130px] truncate text-sm font-medium text-foreground sm:inline"
              >
                {userName}
              </span>
              <Badge
                variant="secondary"
                className="hidden rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground min-[480px]:inline-flex"
              >
                {roleLabel}
              </Badge>
            </div>

            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Déconnexion"
                title="Déconnexion"
                className="rounded-lg text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>

        {/* Contenu principal max-w-6xl centré */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-8">
          {children}
        </main>
      </div>

      {/* Barre basse mobile respectant env(safe-area-inset-bottom) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-surface/95 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden"
        aria-label="Navigation mobile"
      >
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[11px] font-medium transition-colors",
                isActive ? "text-brand" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-0.5 w-6 rounded-full bg-brand"
                />
              )}
              <Icon className="h-[18px] w-[18px]" />
              <span className="max-w-[70px] truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
