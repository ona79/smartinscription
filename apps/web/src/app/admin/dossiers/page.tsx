import Link from "next/link";
import {
  CURRENT_ACADEMIC_YEAR,
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
  ROLES,
  type RegistrationStatus,
} from "@smartinscription/shared";
import { FileText, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-5">
      <PageHeader
        title="Dossiers d'inscription"
        description={`${total} dossier(s) pour l'année ${CURRENT_ACADEMIC_YEAR}.`}
      />

      {/* Filtres et recherche */}
      <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs">
        <CardContent className="p-4">
          <form method="GET" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Nom, prénom ou N° étudiant..."
                className="h-10 rounded-lg pl-9 text-sm"
              />
            </div>

            <select
              name="statut"
              defaultValue={params.statut ?? ""}
              aria-label="Filtrer par statut"
              className="h-10 rounded-lg border border-input bg-surface px-3 text-sm"
            >
              <option value="">Tous les statuts</option>
              {Object.values(REGISTRATION_STATUSES).map((st) => (
                <option key={st} value={st}>
                  {REGISTRATION_STATUS_LABELS_FR[st]}
                </option>
              ))}
            </select>

            <select
              name="ufrId"
              defaultValue={params.ufrId ?? ""}
              aria-label="Filtrer par UFR"
              className="h-10 rounded-lg border border-input bg-surface px-3 text-sm"
            >
              <option value="">Toutes les UFR</option>
              {ufrs.map((ufr) => (
                <option key={ufr.id} value={ufr.id}>
                  {ufr.code} — {ufr.nom}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                name="aiClass"
                defaultValue={params.aiClass ?? ""}
                aria-label="Filtrer par classe IA"
                className="h-10 flex-1 rounded-lg border border-input bg-surface px-2.5 text-sm"
              >
                <option value="">Classe IA</option>
                <option value="CONFORME">CONFORME</option>
                <option value="A_VERIFIER">A_VERIFIER</option>
                <option value="SUSPECT">SUSPECT</option>
              </select>
              <Button
                type="submit"
                className="h-10 shrink-0 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
              >
                Filtrer
              </Button>
            </div>
          </form>
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
          <CardContent className="p-5">
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

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-[13px]">
                <span className="text-muted-foreground">
                  Page {page} sur {totalPages}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={buildPageHref(page - 1)}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "h-9 rounded-lg"
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
                        "h-9 rounded-lg"
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
