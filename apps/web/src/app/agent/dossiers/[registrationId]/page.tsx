import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DOCUMENT_TYPES,
  PAYMENT_STATUSES,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { finalizeRegistrationAction } from "@/features/documents/actions";
import { DocumentReviewItem } from "@/features/documents/components/document-review-item";
import { getSignedDocumentUrl } from "@/features/documents/services/document-service";
import { StudentCard } from "@/features/dossier/components/student-card";
import { generateQrDataUrl } from "@/features/recu/services/receipt-service";
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
    select: {
      id: true,
      anneeAcademique: true,
      statut: true,
      student: {
        select: {
          numeroEtudiant: true,
          niveau: true,
          birthDate: true,
          birthPlace: true,
          nationality: true,
          user: { select: { prenom: true, nom: true, email: true, telephone: true } },
          ufr: { select: { nom: true, code: true } },
          filiere: { select: { nom: true } },
        },
      },
      payments: {
        where: { statut: PAYMENT_STATUSES.SUCCESS },
        select: { qrToken: true },
        take: 1,
      },
      documents: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          url: true,
          verificationStatus: true,
          motif: true,
        },
      },
    },
  });

  if (!registration) {
    notFound();
  }

  const student = registration.student;
  const regStatus = registration.statut as RegistrationStatus;
  const canFinalize = regStatus === REGISTRATION_STATUSES.DOCS_COMPLETE;
  const photoDoc = registration.documents.find((d) => d.type === DOCUMENT_TYPES.PHOTO);
  const qrToken = registration.payments[0]?.qrToken ?? null;

  const [photoUrl, qrDataUrl] = await Promise.all([
    photoDoc
      ? getSignedDocumentUrl(photoDoc.url, { expiresInSeconds: 600, isPhoto: true })
      : Promise.resolve(null),
    qrToken ? generateQrDataUrl(qrToken) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/agent"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9 rounded-lg")}
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

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Carte étudiante en lecture seule */}
        <div className="lg:col-span-5">
          <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-semibold">
                Carte étudiante (lecture seule)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <StudentCard
                editable={false}
                student={{
                  numeroEtudiant: student.numeroEtudiant,
                  nom: student.user.nom,
                  prenom: student.user.prenom,
                  birthDate: student.birthDate,
                  birthPlace: student.birthPlace,
                  nationality: student.nationality,
                  telephone: student.user.telephone,
                  email: student.user.email,
                  ufrName: student.ufr.nom,
                  ufrCode: student.ufr.code,
                  filiereName: student.filiere.nom,
                  niveau: student.niveau,
                  anneeAcademique: registration.anneeAcademique,
                  photoUrl,
                  qrDataUrl,
                  isPaid: Boolean(qrToken),
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Panneau des pièces justificatives */}
        <div className="space-y-4 lg:col-span-7">
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
            <Card className="rounded-xl border border-brand/30 bg-accent/40 py-0 shadow-xs">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                      className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
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
                      className="h-10 rounded-lg px-4 text-sm font-medium"
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
      </div>
    </div>
  );
}
