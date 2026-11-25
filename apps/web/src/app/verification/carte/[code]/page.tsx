import Link from "next/link";
import { redirect } from "next/navigation";
import {
  APPOINTMENT_STATUSES,
  CURRENT_ACADEMIC_YEAR,
  DOCUMENT_TYPE_LABELS_FR,
  DOCUMENT_TYPES,
  PAYMENT_METHOD_LABELS_FR,
  PAYMENT_STATUSES,
  REGISTRATION_STATUS_LABELS_FR,
  ROLES,
  type DocumentStatus,
  type DocumentType,
  type PaymentMethod,
  type RegistrationStatus,
} from "@smartinscription/shared";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  QrCode,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/lib/session";
import {
  recordCardCheckIn,
  verifyCardQrInDb,
} from "@/features/carte-qr/services/card-qr-service";
import { getSignedDocumentUrl } from "@/features/documents/services/document-service";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface CardVerificationPageProps {
  params: Promise<{ code: string }>;
}

const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

export default async function CardVerificationPage({ params }: CardVerificationPageProps) {
  const { code } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(`/verification/carte/${code}`)}`);
  }

  if (user.role !== ROLES.AGENT && user.role !== ROLES.ADMIN) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md rounded-xl border-2 border-destructive bg-surface py-0 shadow-xs">
          <CardContent className="flex flex-col items-center space-y-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Accès réservé aux agents
            </h1>
            <p className="text-sm text-muted-foreground">
              Seuls les agents de scolarité et administrateurs peuvent consulter la fiche
              d&apos;identité d&apos;une carte étudiante.
            </p>
            <Link
              href="/etudiant"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full rounded-lg sm:w-auto"
              )}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Retour à mon espace
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const verified = await verifyCardQrInDb({
    rawCode: code,
    requesterRole: user.role,
  });

  if (!verified.valid) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md rounded-xl border-2 border-destructive bg-surface py-0 shadow-xs">
          <CardContent className="flex flex-col items-center space-y-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>
            <Badge variant="destructive" className="rounded-full px-3 py-0.5 text-xs">
              Code invalide
            </Badge>
            <h1 className="text-lg font-semibold text-foreground">Code invalide</h1>
            <p className="text-sm text-muted-foreground">
              Ce QR code est falsifié, expiré ou a été révoqué.
            </p>
            <Link
              href="/agent/scan"
              className={cn(
                buttonVariants({ size: "default" }),
                "w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark sm:w-auto"
              )}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner un autre
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: verified.studentId },
    select: {
      id: true,
      userId: true,
      numeroEtudiant: true,
      niveau: true,
      user: { select: { prenom: true, nom: true } },
      ufr: { select: { code: true, nom: true } },
      filiere: { select: { nom: true } },
      registrations: {
        where: { anneeAcademique: CURRENT_ACADEMIC_YEAR },
        take: 1,
        select: {
          id: true,
          anneeAcademique: true,
          niveau: true,
          statut: true,
          buStatus: true,
          buValidatedAt: true,
          payments: {
            where: { statut: PAYMENT_STATUSES.SUCCESS },
            orderBy: { paidAt: "desc" },
            take: 1,
            select: {
              montant: true,
              moyen: true,
              paidAt: true,
              receiptNumber: true,
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              url: true,
              verificationStatus: true,
            },
          },
          fraudAlerts: {
            where: { resolu: false },
            select: { id: true, type: true, score: true },
          },
        },
      },
      appointments: {
        where: {
          statut: APPOINTMENT_STATUSES.SCHEDULED,
          debut: { gte: new Date() },
        },
        orderBy: { debut: "asc" },
        take: 1,
        select: { debut: true },
      },
    },
  });

  if (!student) {
    return null;
  }

  const reg = student.registrations[0] ?? null;
  const photoDoc = reg?.documents.find((d) => d.type === DOCUMENT_TYPES.PHOTO);
  const [photoUrl] = await Promise.all([
    photoDoc
      ? getSignedDocumentUrl(photoDoc.url, { expiresInSeconds: 600, isPhoto: true })
      : Promise.resolve(null),
    recordCardCheckIn({
      studentUserId: student.userId,
      registrationId: reg?.id ?? null,
    }),
  ]);

  const paidPayment = reg?.payments[0] ?? null;
  const nextAppointment = student.appointments[0] ?? null;
  const unresolvedFraudCount = reg?.fraudAlerts.length ?? 0;
  const docsCount = reg?.documents.length ?? 0;
  const regStatus = reg?.statut as RegistrationStatus | undefined;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <span className="text-sm font-semibold">Contrôle d&apos;identité</span>
          </div>
          <Link
            href="/agent/scan"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Scanner
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {/* Bandeau alerte fraude si non résolue */}
        {unresolvedFraudCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-sm font-medium text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              Attention : {unresolvedFraudCount} alerte(s) fraude non résolue(s) associée(s) à
              ce dossier.
            </span>
          </div>
        )}

        {/* Identité principale avec grande photo */}
        <Card className="rounded-xl border-2 border-brand bg-surface py-0 shadow-xs">
          <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
            {photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photoUrl}
                alt={`Photo de ${student.user.prenom} ${student.user.nom}`}
                className="aspect-[3/4] w-28 shrink-0 rounded-xl border border-border object-cover object-top sm:w-32"
              />
            ) : (
              <div className="flex aspect-[3/4] w-28 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground sm:w-32">
                <User className="h-9 w-9" />
                <span className="mt-1 text-xs">Sans photo</span>
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className="rounded-full bg-success px-3 py-0.5 text-xs font-semibold text-white">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Carte authentique
                </Badge>
                {regStatus && (
                  <Badge className="rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                    {REGISTRATION_STATUS_LABELS_FR[regStatus]}
                  </Badge>
                )}
              </div>

              <div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                  {student.user.prenom} {student.user.nom.toUpperCase()}
                </h1>
                <p className="font-mono text-sm font-semibold text-brand">
                  {student.numeroEtudiant}
                </p>
              </div>

              <div className="space-y-0.5 text-sm text-muted-foreground">
                <p>
                  {student.ufr.code} — {student.ufr.nom}
                </p>
                <p>
                  {student.filiere.nom} · {reg?.niveau ?? student.niveau} ·{" "}
                  {reg?.anneeAcademique ?? CURRENT_ACADEMIC_YEAR}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paiement & Accès BU */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
              <CreditCard className="h-4 w-4 text-brand" />
              <CardTitle className="text-base font-semibold">Paiement</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-sm">
              {paidPayment ? (
                <div className="space-y-1">
                  <p className="font-semibold text-success">
                    Effectué — {paidPayment.montant.toLocaleString("fr-FR")} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS_FR[paidPayment.moyen as PaymentMethod]} ·{" "}
                    {paidPayment.paidAt
                      ? new Date(paidPayment.paidAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </p>
                  {paidPayment.receiptNumber && (
                    <p className="font-mono text-xs text-foreground">
                      Reçu : {paidPayment.receiptNumber}
                    </p>
                  )}
                </div>
              ) : (
                <p className="font-medium text-destructive">Non payé</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
              <BookOpen className="h-4 w-4 text-brand" />
              <CardTitle className="text-base font-semibold">
                Accès BU ({reg?.anneeAcademique ?? CURRENT_ACADEMIC_YEAR})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-sm">
              {reg?.buStatus === "ACTIVE" ? (
                <p className="font-semibold text-success">
                  Active
                  {reg.buValidatedAt
                    ? ` depuis le ${new Date(reg.buValidatedAt).toLocaleDateString("fr-FR")}`
                    : ""}
                </p>
              ) : (
                <p className="text-muted-foreground">Non activé</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pièces justificatives n/4 & Prochain rendez-vous */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" />
                <CardTitle className="text-base font-semibold">
                  Pièces ({docsCount}/4)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 p-4 pt-1 text-xs">
              {reg && reg.documents.length > 0 ? (
                reg.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">
                      {DOCUMENT_TYPE_LABELS_FR[doc.type as DocumentType]}
                    </span>
                    <Badge
                      variant="secondary"
                      className={
                        doc.verificationStatus === "APPROVED"
                          ? "rounded-full bg-success text-white text-[11px]"
                          : doc.verificationStatus === "REJECTED"
                            ? "rounded-full bg-destructive text-white text-[11px]"
                            : "rounded-full bg-amber-100 text-amber-800 text-[11px]"
                      }
                    >
                      {DOC_STATUS_LABELS[doc.verificationStatus as DocumentStatus]}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Aucune pièce déposée.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
              <Calendar className="h-4 w-4 text-brand" />
              <CardTitle className="text-base font-semibold">Prochain rendez-vous</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-sm">
              {nextAppointment ? (
                <p className="font-medium capitalize text-foreground">
                  {new Date(nextAppointment.debut).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              ) : (
                <p className="text-muted-foreground">Aucun rendez-vous planifié.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          {reg && (
            <Link
              href={`/agent/dossiers/${reg.id}`}
              className={cn(
                buttonVariants({ size: "default" }),
                "w-full rounded-lg bg-brand text-sm font-semibold text-brand-foreground hover:bg-brand-dark sm:flex-1"
              )}
            >
              Ouvrir le dossier complet
            </Link>
          )}
          <Link
            href="/agent/scan"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "w-full rounded-lg text-sm font-semibold sm:flex-1"
            )}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scanner un autre
          </Link>
        </div>
      </main>
    </div>
  );
}
