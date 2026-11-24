import { ROLE_LABELS_FR, ROLES } from "@smartinscription/shared";
import { PageHeader } from "@/components/page-header";
import { PortalShell, type PortalNavItem } from "@/components/layout/portal-shell";
import { requireRole } from "@/features/auth/lib/session";
import { VerificationResultCard } from "@/features/scan/components/verification-result-card";
import { verifyReceiptByQrToken } from "@/features/scan/services/verification-service";

const AGENT_NAV_ITEMS: PortalNavItem[] = [
  { href: "/agent", label: "Accueil agent", shortLabel: "Accueil", icon: "home" },
  { href: "/agent/scan", label: "Scan QR", shortLabel: "Scan QR", icon: "qr" },
];

interface VerificationPageProps {
  params: Promise<{ qrToken: string }>;
}

/** Route serveur protégée (/verification/<qrToken>) réservée aux rôles AGENT et ADMIN. */
export default async function VerificationTokenPage({ params }: VerificationPageProps) {
  const user = await requireRole([ROLES.AGENT, ROLES.ADMIN]);
  const { qrToken } = await params;

  const result = await verifyReceiptByQrToken({
    rawToken: qrToken,
    requesterId: user.id,
    requesterRole: user.role,
  });

  return (
    <PortalShell
      spaceTitle="Espace Agent"
      roleLabel={ROLE_LABELS_FR[user.role]}
      userName={`${user.prenom} ${user.nom}`}
      userEmail={user.email}
      navItems={AGENT_NAV_ITEMS}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Vérification du reçu"
          description="Contrôle d'authenticité du paiement et de l'état du dossier étudiant."
        />
        <VerificationResultCard result={result} />
      </div>
    </PortalShell>
  );
}
