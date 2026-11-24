import { ROLE_LABELS_FR, ROLES } from "@smartinscription/shared";
import { PortalShell, type PortalNavItem } from "@/components/layout/portal-shell";
import { requireRole } from "@/features/auth/lib/session";

const AGENT_NAV_ITEMS: PortalNavItem[] = [
  { href: "/agent", label: "Accueil agent", shortLabel: "Accueil", icon: "home" },
  { href: "/agent/scan", label: "Scan QR", shortLabel: "Scan QR", icon: "qr" },
];

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);

  return (
    <PortalShell
      spaceTitle="Espace Agent"
      roleLabel={ROLE_LABELS_FR[user.role]}
      userName={`${user.prenom} ${user.nom}`}
      userEmail={user.email}
      navItems={AGENT_NAV_ITEMS}
    >
      {children}
    </PortalShell>
  );
}
