import { ROLES } from "@smartinscription/shared";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/features/auth/lib/session";
import { QrScanClient } from "@/features/scan/components/qr-scan-client";

export default async function AgentScanPage() {
  await requireRole([ROLES.AGENT, ROLES.ADMIN]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Scan QR Code"
        description="Scannez le QR code du reçu étudiant ou saisissez le jeton manuellement pour vérifier le paiement."
      />
      <QrScanClient />
    </div>
  );
}
