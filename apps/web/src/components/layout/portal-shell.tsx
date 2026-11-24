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
  ShieldCheck,
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
    <div className="flex min-h-screen flex-col bg-muted/30 md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <ShieldCheck className="h-6 w-6 text-teal-700" />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">SmartInscription IA</span>
            <span className="text-xs text-muted-foreground">{spaceTitle}</span>
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
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-700 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <Badge variant="secondary">{roleLabel}</Badge>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-700" />
          <span className="text-sm font-bold">{spaceTitle}</span>
          <Badge variant="secondary" className="text-[10px]">
            {roleLabel}
          </Badge>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t bg-background px-1 md:hidden"
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
                "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium",
                isActive ? "text-teal-700" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[72px]">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
