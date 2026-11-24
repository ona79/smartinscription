import Link from "next/link";
import { notFound } from "next/navigation";
import {
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
  type DocumentStatus,
  type DocumentType,
  type RegistrationStatus,
} from "@smartinscription/shared";
import { ArrowLeft, CheckCircle2, FileText, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { finalizeRegistrationAction } from "@/features/documents/actions";
import { DocumentReviewItem } from "@/features/documents/components/document-review-item";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface AgentDossierDetailProps {
  params: Promise<{ registrationId: string }>;
}

export default async function AgentDossierDetailPage({ params }: AgentDossierDetailProps) {
  await requireRole([ROLES.AGENT, ROLES.ADMIN]);
  const { registrationId } = await params;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      student: {
        include: { user: true, ufr: true, filiere: true },
      },
      documents: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!registration) {
    notFound();
  }

  const student = registration.student;
  const regStatus = registration.statut as RegistrationStatus;
  const canFinalize = regStatus === REGISTRATION_STATUSES.DOCS_COMPLETE;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/agent"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-xl")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour à la liste
        </Link>
      </div>

      <PageHeader
        title={`${student.user.prenom} ${student.user.nom}`}
        description={`${student.numeroEtudiant} · ${student.ufr.nom} · ${student.filiere.nom} (${student.niveau})`}
        badge={
          <Badge className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            {REGISTRATION_STATUS_LABELS_FR[regStatus]}
          </Badge>
        }
      />

      {registration.documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document déposé"
          description="L'étudiant n'a pas encore téléversé de pièce justificative."
        />
      ) : (
        <div className="space-y-3">
          {registration.documents.map((doc) => (
            <DocumentReviewItem
              key={doc.id}
              documentId={doc.id}
              registrationId={registration.id}
              type={doc.type as DocumentType}
              status={doc.verificationStatus as DocumentStatus}
              motif={doc.motif}
            />
          ))}
        </div>
      )}

      {canFinalize && (
        <Card className="rounded-2xl border-brand/30 bg-accent/40 shadow-none">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Toutes les pièces sont approuvées
              </h2>
              <p className="text-sm text-muted-foreground">
                Vous pouvez maintenant valider définitivement l&apos;inscription de l&apos;étudiant.
              </p>
            </div>
            <div className="flex gap-2">
              <form action={finalizeRegistrationAction}>
                <input type="hidden" name="registrationId" value={registration.id} />
                <input type="hidden" name="decision" value="VALIDATED" />
                <Button
                  type="submit"
                  className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Valider le dossier
                </Button>
              </form>
              <form action={finalizeRegistrationAction}>
                <input type="hidden" name="registrationId" value={registration.id} />
                <input type="hidden" name="decision" value="REJECTED" />
                <Button
                  type="submit"
                  variant="destructive"
                  className="h-10 rounded-xl px-4 text-sm font-semibold"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
