import { ROLE_LABELS_FR, ROLES } from "@smartinscription/shared";
import { PortalShell, type PortalNavItem } from "@/components/layout/portal-shell";
import { requireRole } from "@/features/auth/lib/session";

const ADMIN_NAV_ITEMS: PortalNavItem[] = [
  { href: "/admin", label: "Tableau de bord", shortLabel: "Accueil", icon: "dashboard" },
  { href: "/admin/dossiers", label: "Dossiers", shortLabel: "Dossiers", icon: "file" },
  { href: "/admin/statistiques", label: "Statistiques", shortLabel: "Stats", icon: "stats" },
  { href: "/admin/alertes-fraude", label: "Alertes fraude", shortLabel: "Fraude", icon: "fraud" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole([ROLES.ADMIN]);

  return (
    <PortalShell
      spaceTitle="Administration"
      roleLabel={ROLE_LABELS_FR[user.role]}
      userName={`${user.prenom} ${user.nom}`}
      userEmail={user.email}
      navItems={ADMIN_NAV_ITEMS}
    >
      {children}
    </PortalShell>
  );
}
