import Link from "next/link";
import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUS_LABELS_FR,
  ROLES,
  type RegistrationStatus,
} from "@smartinscription/shared";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminDossiersFilters } from "@/features/admin/components/admin-dossiers-filters";
import { getAdminDossiers } from "@/features/admin/queries";
import { requireRole } from "@/features/auth/lib/session";
import { measurePerf } from "@/lib/perf";
import { cn } from "@/lib/utils";

interface AdminDossiersPageProps {
  searchParams: Promise<{
    statut?: string;
    ufrId?: string;
    aiClass?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AdminDossiersPage({ searchParams }: AdminDossiersPageProps) {
  return measurePerf("page", "/admin/dossiers", async () => {
    await requireRole([ROLES.ADMIN]);
    const params = await searchParams;
    const page = Math.max(1, Number(params.page ?? "1") || 1);

    const { items, total, totalPages, ufrs } = await getAdminDossiers({
      statut: params.statut,
      ufrId: params.ufrId,
      aiClass: params.aiClass,
      q: params.q,
      page,
    });

    function buildPageHref(targetPage: number): string {
      const sp = new URLSearchParams();
      if (params.statut) sp.set("statut", params.statut);
      if (params.ufrId) sp.set("ufrId", params.ufrId);
      if (params.aiClass) sp.set("aiClass", params.aiClass);
      if (params.q) sp.set("q", params.q);
      sp.set("page", String(targetPage));
      return `/admin/dossiers?${sp.toString()}`;
    }

    return (
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title="Dossiers d'inscription"
          description={`${total} dossier(s) pour l'année ${CURRENT_ACADEMIC_YEAR}.`}
        />

        {/* Recherche en haut + Filtres dans une feuille sur mobile */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
          <CardContent className="p-4">
            <AdminDossiersFilters
              q={params.q}
              statut={params.statut}
              ufrId={params.ufrId}
              aiClass={params.aiClass}
              ufrs={ufrs}
            />
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun dossier trouvé"
            description="Aucun dossier ne correspond aux critères de recherche."
          />
        ) : (
          <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              {/* Mobile : liste de cartes */}
              <div className="space-y-2.5 md:hidden">
                {items.map((reg) => (
                  <div
                    key={reg.id}
                    className="space-y-1.5 rounded-xl border border-border bg-background/50 p-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {reg.student.user.prenom} {reg.student.user.nom}
                      </p>
                      <Badge variant="secondary" className="rounded-full text-[11px]">
                        {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {reg.student.numeroEtudiant}
                      {reg.payments[0]?.receiptNumber
                        ? ` · Reçu ${reg.payments[0].receiptNumber}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {reg.student.ufr.code} — {reg.student.filiere.nom} ({reg.student.niveau})
                      </p>
                      {reg.aiClass && (
                        <Badge
                          variant={reg.aiClass === "SUSPECT" ? "destructive" : "secondary"}
                          className="rounded-full text-[11px]"
                        >
                          {reg.aiClass}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop : tableau */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>N° étudiant</TableHead>
                      <TableHead>UFR / Filière</TableHead>
                      <TableHead>Classe IA</TableHead>
                      <TableHead>Reçu</TableHead>
                      <TableHead className="text-right">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">
                          {reg.student.user.prenom} {reg.student.user.nom}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {reg.student.numeroEtudiant}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {reg.student.ufr.code} — {reg.student.filiere.nom} ({reg.student.niveau})
                        </TableCell>
                        <TableCell>
                          {reg.aiClass ? (
                            <Badge
                              variant={reg.aiClass === "SUSPECT" ? "destructive" : "secondary"}
                              className="rounded-full text-xs"
                            >
                              {reg.aiClass}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {reg.payments[0]?.receiptNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="rounded-full text-xs">
                            {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[13px]">
                  <span className="text-muted-foreground">
                    Page {page} sur {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={buildPageHref(page - 1)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-lg"
                        )}
                      >
                        Précédent
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={buildPageHref(page + 1)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-lg"
                        )}
                      >
                        Suivant
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  });
}
