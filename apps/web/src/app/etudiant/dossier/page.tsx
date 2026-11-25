import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUS_LABELS_FR,
  ROLES,
} from "@smartinscription/shared";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/features/auth/lib/session";
import { ProfileCompletionForm } from "@/features/dossier/components/profile-completion-form";
import {
  getStudentDashboardData,
  getUfrsWithFilieres,
} from "@/features/dossier/queries";

export default async function StudentDossierPage() {
  const user = await requireRole([ROLES.STUDENT]);
  const { student, registration } = await getStudentDashboardData(user.id);

  if (!student) {
    const ufrs = await getUfrsWithFilieres();

    return (
      <div className="max-w-xl space-y-5">
        <PageHeader
          title="Compléter mon dossier étudiant"
          description={`Renseignez vos informations académiques pour l'année ${CURRENT_ACADEMIC_YEAR}.`}
        />

        <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold">
              Informations académiques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ProfileCompletionForm ufrs={ufrs} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Mon dossier d'inscription"
        description={`Année académique ${CURRENT_ACADEMIC_YEAR}`}
        badge={
          registration ? (
            <Badge
              variant="secondary"
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {REGISTRATION_STATUS_LABELS_FR[registration.statut]}
            </Badge>
          ) : null
        }
      />

      <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Nom complet</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {user.prenom} {user.nom}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Numéro étudiant</p>
            <p className="mt-0.5 font-mono text-sm font-medium text-foreground">
              {student.numeroEtudiant}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">UFR</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {student.ufr.code} — {student.ufr.nom}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Filière</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {student.filiere.nom}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Niveau</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{student.niveau}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Année académique</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {registration?.anneeAcademique ?? CURRENT_ACADEMIC_YEAR}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
