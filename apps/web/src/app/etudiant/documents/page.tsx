import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUSES,
  ROLES,
  type DocumentStatus,
} from "@smartinscription/shared";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/features/auth/lib/session";
import { DocumentUploadCard } from "@/features/documents/components/document-upload-card";
import { REQUIRED_DOCUMENT_TYPES } from "@/features/documents/services/document-service";
import { getStudentDashboardData } from "@/features/dossier/queries";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function StudentDocumentsPage() {
  const user = await requireRole([ROLES.STUDENT]);
  const { student, registration } = await getStudentDashboardData(user.id);

  if (!student || !registration) {
    redirect("/etudiant/dossier");
  }

  const isPaid =
    registration.statut !== REGISTRATION_STATUSES.DRAFT &&
    registration.statut !== REGISTRATION_STATUSES.PENDING_PAYMENT &&
    registration.statut !== REGISTRATION_STATUSES.REJECTED;

  const docs = await prisma.document.findMany({
    where: { registrationId: registration.id },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Pièces justificatives"
        description={`Année académique ${CURRENT_ACADEMIC_YEAR} — Déposez vos 4 pièces obligatoires pour validation.`}
      />

      {!isPaid ? (
        <EmptyState
          icon={CreditCard}
          title="Paiement requis avant le dépôt"
          description="Réglez d'abord les frais d'inscription de 25 000 FCFA pour débloquer le téléversement de vos pièces justificatives."
          action={
            <Link
              href="/etudiant/paiement"
              className={cn(
                buttonVariants({ size: "default" }),
                "h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
              )}
            >
              Payer mes frais
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {REQUIRED_DOCUMENT_TYPES.map((docType) => {
            const existing = docs.find((d) => d.type === docType);
            return (
              <DocumentUploadCard
                key={docType}
                type={docType}
                existingDoc={
                  existing
                    ? {
                        id: existing.id,
                        verificationStatus: existing.verificationStatus as DocumentStatus,
                        motif: existing.motif,
                      }
                    : null
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
