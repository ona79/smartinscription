import { ROLE_LABELS_FR, ROLES } from "@smartinscription/shared";
import { PortalShell, type PortalNavItem } from "@/components/layout/portal-shell";
import { requireRole } from "@/features/auth/lib/session";
import { FaqChatbotWidget } from "@/features/ia/components/faq-chatbot-widget";

const STUDENT_NAV_ITEMS: PortalNavItem[] = [
  { href: "/etudiant", label: "Tableau de bord", shortLabel: "Accueil", icon: "dashboard" },
  { href: "/etudiant/dossier", label: "Mon dossier", shortLabel: "Dossier", icon: "file" },
  { href: "/etudiant/paiement", label: "Paiement", shortLabel: "Paiement", icon: "payment" },
  { href: "/etudiant/documents", label: "Documents", shortLabel: "Docs", icon: "documents" },
  { href: "/etudiant/rendez-vous", label: "Rendez-vous", shortLabel: "RDV", icon: "calendar" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole([ROLES.STUDENT]);

  return (
    <PortalShell
      spaceTitle="Espace Étudiant"
      roleLabel={ROLE_LABELS_FR[user.role]}
      userName={`${user.prenom} ${user.nom}`}
      userEmail={user.email}
      navItems={STUDENT_NAV_ITEMS}
    >
      {children}
      <FaqChatbotWidget />
    </PortalShell>
  );
}
