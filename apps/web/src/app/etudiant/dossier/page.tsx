import {
  ACADEMIC_LEVEL_LABELS_FR,
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
  type AcademicLevel,
} from "@smartinscription/shared";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { PhotoUploader } from "@/features/documents/components/photo-uploader";
import { BirthInfoEditForm } from "@/features/dossier/components/birth-info-edit-form";
import { ProfileCompletionForm } from "@/features/dossier/components/profile-completion-form";
import { StudentCard } from "@/features/dossier/components/student-card";
import {
  getStudentDossierWithCard,
  getUfrsWithFilieres,
} from "@/features/dossier/queries";
import { measurePerf } from "@/lib/perf";

export default async function StudentDossierPage() {
  return measurePerf("page", "/etudiant/dossier", async () => {
    const user = await requireRole([ROLES.STUDENT]);
    const {
      student,
      registration,
      photoDoc,
      photoUrl,
      cardQrSvgUrl,
      academicColumns,
      isPaid,
    } = await getStudentDossierWithCard(user.id);

    if (!student || !registration) {
      const ufrs = await getUfrsWithFilieres();

      return (
        <div className="w-full max-w-2xl space-y-2.5 lg:max-w-[66%]">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Compléter mon dossier ({CURRENT_ACADEMIC_YEAR})
          </h1>

          <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardContent className="p-3 sm:p-3.5">
              <ProfileCompletionForm ufrs={ufrs} />
            </CardContent>
          </Card>
        </div>
      );
    }

    const isValidated = registration.statut === REGISTRATION_STATUSES.VALIDATED;
    const photoLocked = isValidated && photoDoc?.verificationStatus !== "REJECTED";

    return (
      <div className="space-y-5">
        <PageHeader
          title="Mon dossier d'inscription"
          description={`Année académique ${CURRENT_ACADEMIC_YEAR}`}
          badge={
            <Badge
              variant="secondary"
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {REGISTRATION_STATUS_LABELS_FR[registration.statut]}
            </Badge>
          }
        />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          {/* Carte étudiante à gauche sur grand écran, centrée sur mobile/tablette */}
          <section className="space-y-2.5 lg:col-span-5" aria-labelledby="student-card-heading">
            <h2
              id="student-card-heading"
              className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:text-left"
            >
              Carte étudiante numérique
            </h2>
            <StudentCard
              editable
              photoLocked={photoLocked}
              student={{
                numeroEtudiant: student.numeroEtudiant,
                nom: user.nom,
                prenom: user.prenom,
                birthDate: student.birthDate,
                birthPlace: student.birthPlace,
                nationality: student.nationality,
                telephone: user.telephone,
                email: user.email,
                ufrName: student.ufr.nom,
                ufrCode: student.ufr.code,
                filiereName: student.filiere.nom,
                niveau: registration.niveau ?? student.niveau,
                anneeAcademique: registration.anneeAcademique,
                photoUrl,
                cardQrSvgUrl,
                academicColumns,
                isPaid,
              }}
            />
          </section>

          {/* Informations du dossier + Photo d'identité à droite sur grand écran */}
          <div className="space-y-3 lg:col-span-7">
            <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
              <CardHeader className="px-3.5 pt-3 pb-1.5 sm:px-4 sm:pt-3.5">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  Informations académiques &amp; état civil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-3.5 pt-1 pb-3.5 sm:px-4 sm:pb-4">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 [&>*]:min-w-0">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Nom complet</p>
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                      {user.prenom} {user.nom}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">N° étudiant</p>
                    <p className="truncate font-mono text-xs font-medium text-foreground sm:text-sm">
                      {student.numeroEtudiant}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Niveau / Année</p>
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                      {ACADEMIC_LEVEL_LABELS_FR[student.niveau as AcademicLevel] ??
                        student.niveau}{" "}
                      · {registration.anneeAcademique}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">UFR</p>
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm" title={`${student.ufr.code} — ${student.ufr.nom}`}>
                      {student.ufr.code} — {student.ufr.nom}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Filière</p>
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm" title={student.filiere.nom}>
                      {student.filiere.nom}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Accès BU</p>
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                      {registration.buStatus === "ACTIVE"
                        ? registration.buValidatedAt
                          ? `Active (${new Date(registration.buValidatedAt).toLocaleDateString("fr-FR")})`
                          : "Active"
                        : "Non activé"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-2.5">
                  <BirthInfoEditForm
                    birthDate={student.birthDate}
                    birthPlace={student.birthPlace}
                    nationality={student.nationality}
                    disabled={isValidated}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bloc Photo d'identité */}
            <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
              <CardHeader className="px-3.5 pt-3 pb-1 sm:px-4 sm:pt-3.5">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  Photo d&apos;identité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3.5 pt-1 pb-3.5 sm:px-4 sm:pb-4">
                <p className="text-xs text-muted-foreground">
                  Visage dégagé, fond uni, cadrage portrait. Synchronisée avec la pièce « Photo d&apos;identité ».
                </p>

                {photoDoc?.verificationStatus === "REJECTED" && photoDoc.motif && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Photo rejetée : {photoDoc.motif}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {photoUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photoUrl}
                      alt="Photo d'identité actuelle"
                      className="h-16 w-12 shrink-0 rounded-lg border border-border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <PhotoUploader
                      mode="immediate"
                      fullWidthMobile
                      disabled={photoLocked}
                      label={photoUrl ? "Remplacer ma photo" : "Envoyer ma photo"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  });
}
