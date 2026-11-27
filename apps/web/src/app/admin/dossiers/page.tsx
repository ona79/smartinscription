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
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          title="Dossiers d'inscription"
          description={`${total} dossier(s) · ${CURRENT_ACADEMIC_YEAR}`}
        />

        {/* Barre de recherche & filtres compacte sans bloc superflu */}
        <AdminDossiersFilters
          q={params.q}
          statut={params.statut}
          ufrId={params.ufrId}
          aiClass={params.aiClass}
          ufrs={ufrs}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun dossier trouvé"
            description="Aucun dossier ne correspond aux critères de recherche."
          />
        ) : (
          <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
            <CardContent className="px-3.5 py-2 sm:px-4 sm:py-2.5">
              {/* Mobile : liste compacte */}
              <div className="divide-y divide-border/70 md:hidden">
                {items.map((reg) => (
                  <div key={reg.id} className="space-y-0.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {reg.student.user.prenom} {reg.student.user.nom}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        {reg.aiClass && (
                          <Badge
                            variant={reg.aiClass === "SUSPECT" ? "destructive" : "secondary"}
                            className="rounded-full px-1.5 py-0 text-[10px]"
                          >
                            {reg.aiClass}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                          {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                        </Badge>
                      </div>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      <span className="font-mono">{reg.student.numeroEtudiant}</span> ·{" "}
                      {reg.student.ufr.code} — {reg.student.filiere.nom} ({reg.student.niveau})
                      {reg.payments[0]?.receiptNumber
                        ? ` · ${reg.payments[0].receiptNumber}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop : tableau dense */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs">Étudiant</TableHead>
                      <TableHead className="h-8 text-xs">N° étudiant</TableHead>
                      <TableHead className="h-8 text-xs">UFR / Filière</TableHead>
                      <TableHead className="h-8 text-xs">Classe IA</TableHead>
                      <TableHead className="h-8 text-xs">Reçu</TableHead>
                      <TableHead className="h-8 text-right text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="py-1.5 text-xs font-medium">
                          {reg.student.user.prenom} {reg.student.user.nom}
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-xs">
                          {reg.student.numeroEtudiant}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                          {reg.student.ufr.code} — {reg.student.filiere.nom} ({reg.student.niveau})
                        </TableCell>
                        <TableCell className="py-1.5">
                          {reg.aiClass ? (
                            <Badge
                              variant={reg.aiClass === "SUSPECT" ? "destructive" : "secondary"}
                              className="rounded-full px-2 py-0 text-[11px]"
                            >
                              {reg.aiClass}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-xs">
                          {reg.payments[0]?.receiptNumber ?? "—"}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <Badge variant="secondary" className="rounded-full px-2 py-0 text-[11px]">
                            {REGISTRATION_STATUS_LABELS_FR[reg.statut as RegistrationStatus]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 text-xs">
                  <span className="text-muted-foreground">
                    Page {page} / {totalPages}
                  </span>
                  <div className="flex gap-1.5">
                    {page > 1 && (
                      <Link
                        href={buildPageHref(page - 1)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-7 rounded-lg px-2.5 text-xs"
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
                          "h-7 rounded-lg px-2.5 text-xs"
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
