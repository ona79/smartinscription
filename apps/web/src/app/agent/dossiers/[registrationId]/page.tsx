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
import { ArrowLeft, FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/features/auth/lib/session";
import { RegenerateCardQrButton } from "@/features/carte-qr/components/regenerate-card-qr-button";
import {
  buildCardQrPayload,
  renderCardQrSvg,
} from "@/features/carte-qr/services/card-qr-service";
import { DocumentReviewItem } from "@/features/documents/components/document-review-item";
import { FinalizeRegistrationBar } from "@/features/documents/components/finalize-registration-bar";
import { getSignedDocumentUrl } from "@/features/documents/services/document-service";
import { BuAccessPanel } from "@/features/dossier/components/bu-access-panel";
import { StudentCard } from "@/features/dossier/components/student-card";
import { buildAcademicTableColumns } from "@/features/dossier/lib/academic-table";
import { isBuEligibleStatus } from "@/features/dossier/services/bu-service";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface AgentDossierDetailProps {
  params: Promise<{ registrationId: string }>;
}

export default async function AgentDossierDetailPage({ params }: AgentDossierDetailProps) {
  const actor = await requireRole([ROLES.AGENT, ROLES.ADMIN]);
  const { registrationId } = await params;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      anneeAcademique: true,
      niveau: true,
      statut: true,
      buStatus: true,
      buValidatedAt: true,
      buValidatedBy: { select: { prenom: true, nom: true } },
      student: {
        select: {
          id: true,
          numeroEtudiant: true,
          niveau: true,
          birthDate: true,
          birthPlace: true,
          nationality: true,
          cardQrVersion: true,
          user: { select: { prenom: true, nom: true, email: true, telephone: true } },
          ufr: { select: { nom: true, code: true } },
          filiere: { select: { nom: true } },
          registrations: {
            orderBy: { anneeAcademique: "asc" },
            select: {
              anneeAcademique: true,
              niveau: true,
              statut: true,
              buStatus: true,
            },
          },
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

  const cardQrPayload = buildCardQrPayload({
    studentId: student.id,
    version: student.cardQrVersion,
  });

  const [photoUrl, cardQrSvg] = await Promise.all([
    photoDoc
      ? getSignedDocumentUrl(photoDoc.url, { expiresInSeconds: 600, isPhoto: true })
      : Promise.resolve(null),
    renderCardQrSvg(cardQrPayload),
  ]);

  const cardQrSvgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(cardQrSvg)}`;
  const academicColumns = buildAcademicTableColumns({
    currentAcademicYear: registration.anneeAcademique,
    currentNiveau: registration.niveau ?? student.niveau,
    registrations: student.registrations,
  });
  const buValidatedByName = registration.buValidatedBy
    ? `${registration.buValidatedBy.prenom} ${registration.buValidatedBy.nom}`
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/agent"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour à la liste
        </Link>
      </div>

      <PageHeader
        title={`${student.user.prenom} ${student.user.nom}`}
        description={`${student.numeroEtudiant} · ${student.ufr.nom} · ${student.filiere.nom} (${registration.niveau ?? student.niveau})`}
        badge={
          <Badge className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            {REGISTRATION_STATUS_LABELS_FR[regStatus]}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Carte étudiante compacte en lecture seule + panneau BU */}
        <section
          className="space-y-4 lg:col-span-5"
          aria-labelledby="agent-card-heading"
        >
          <div className="space-y-2.5">
            <h2
              id="agent-card-heading"
              className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:text-left"
            >
              Carte étudiante (lecture seule)
            </h2>
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
                niveau: registration.niveau ?? student.niveau,
                anneeAcademique: registration.anneeAcademique,
                photoUrl,
                cardQrSvgUrl,
                academicColumns,
                isPaid: Boolean(qrToken),
              }}
            />
          </div>

          <BuAccessPanel
            registrationId={registration.id}
            buStatus={registration.buStatus}
            buValidatedAt={registration.buValidatedAt}
            buValidatedByName={buValidatedByName}
            isPaymentConfirmed={isBuEligibleStatus(regStatus)}
          />

          {actor.role === ROLES.ADMIN && (
            <RegenerateCardQrButton
              studentId={student.id}
              registrationId={registration.id}
            />
          )}
        </section>

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

          {canFinalize && <FinalizeRegistrationBar registrationId={registration.id} />}
        </div>
      </div>
    </div>
  );
}
