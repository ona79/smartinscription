"use client";

import { useState } from "react";
import Link from "next/link";
import {
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
} from "@smartinscription/shared";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AdminDossiersFiltersProps {
  q?: string;
  statut?: string;
  ufrId?: string;
  aiClass?: string;
  ufrs: { id: string; code: string; nom: string }[];
}

/**
 * Barre de recherche et filtres des dossiers admin :
 * - sur mobile : recherche en haut + bouton « Filtres » ouvrant une feuille du bas ;
 * - sur desktop : grille complète inline.
 */
export function AdminDossiersFilters({
  q,
  statut,
  ufrId,
  aiClass,
  ufrs,
}: AdminDossiersFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeFiltersCount = [statut, ufrId, aiClass].filter(Boolean).length;

  return (
    <>
      {/* Mobile : recherche + bouton Filtres */}
      <div className="flex gap-1.5 md:hidden">
        <form method="GET" className="flex flex-1 gap-1.5">
          {statut && <input type="hidden" name="statut" value={statut} />}
          {ufrId && <input type="hidden" name="ufrId" value={ufrId} />}
          {aiClass && <input type="hidden" name="aiClass" value={aiClass} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Nom ou N°..."
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-9 shrink-0 rounded-lg bg-brand px-3 text-xs text-brand-foreground hover:bg-brand-dark"
          >
            OK
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSheetOpen(true)}
          className="relative h-9 shrink-0 rounded-lg px-2.5"
          aria-label="Ouvrir les filtres"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Feuille mobile des filtres */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="p-5 md:hidden">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Filtres</DialogTitle>
          </DialogHeader>
          <form method="GET" className="space-y-3">
            {q && <input type="hidden" name="q" value={q} />}
            <div className="space-y-1">
              <label htmlFor="m-statut" className="text-xs font-medium text-muted-foreground">
                Statut
              </label>
              <select
                id="m-statut"
                name="statut"
                defaultValue={statut ?? ""}
                className="h-11 w-full rounded-lg border border-input bg-surface px-3 text-base"
              >
                <option value="">Tous les statuts</option>
                {Object.values(REGISTRATION_STATUSES).map((st) => (
                  <option key={st} value={st}>
                    {REGISTRATION_STATUS_LABELS_FR[st]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="m-ufrId" className="text-xs font-medium text-muted-foreground">
                UFR
              </label>
              <select
                id="m-ufrId"
                name="ufrId"
                defaultValue={ufrId ?? ""}
                className="h-11 w-full rounded-lg border border-input bg-surface px-3 text-base"
              >
                <option value="">Toutes les UFR</option>
                {ufrs.map((ufr) => (
                  <option key={ufr.id} value={ufr.id}>
                    {ufr.code} — {ufr.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="m-aiClass" className="text-xs font-medium text-muted-foreground">
                Classe IA
              </label>
              <select
                id="m-aiClass"
                name="aiClass"
                defaultValue={aiClass ?? ""}
                className="h-11 w-full rounded-lg border border-input bg-surface px-3 text-base"
              >
                <option value="">Toutes</option>
                <option value="CONFORME">CONFORME</option>
                <option value="A_VERIFIER">A_VERIFIER</option>
                <option value="SUSPECT">SUSPECT</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand-dark"
            >
              Appliquer les filtres
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Desktop : barre compacte inline */}
      <form method="GET" className="hidden items-center gap-2 md:flex">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-2 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom, prénom ou N° étudiant..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        <select
          name="statut"
          defaultValue={statut ?? ""}
          aria-label="Filtrer par statut"
          className="h-8 rounded-lg border border-input bg-surface px-2.5 text-xs"
        >
          <option value="">Statut</option>
          {Object.values(REGISTRATION_STATUSES).map((st) => (
            <option key={st} value={st}>
              {REGISTRATION_STATUS_LABELS_FR[st]}
            </option>
          ))}
        </select>

        <select
          name="ufrId"
          defaultValue={ufrId ?? ""}
          aria-label="Filtrer par UFR"
          className="h-8 max-w-[180px] rounded-lg border border-input bg-surface px-2.5 text-xs"
        >
          <option value="">UFR</option>
          {ufrs.map((ufr) => (
            <option key={ufr.id} value={ufr.id}>
              {ufr.code} — {ufr.nom}
            </option>
          ))}
        </select>

        <select
          name="aiClass"
          defaultValue={aiClass ?? ""}
          aria-label="Filtrer par classe IA"
          className="h-8 rounded-lg border border-input bg-surface px-2.5 text-xs"
        >
          <option value="">Classe IA</option>
          <option value="CONFORME">CONFORME</option>
          <option value="A_VERIFIER">A_VERIFIER</option>
          <option value="SUSPECT">SUSPECT</option>
        </select>

        <Button
          type="submit"
          size="sm"
          className="h-8 shrink-0 rounded-lg bg-brand px-3 text-xs font-medium text-brand-foreground hover:bg-brand-dark"
        >
          Filtrer
        </Button>

        {(q || activeFiltersCount > 0) && (
          <Link
            href="/admin/dossiers"
            aria-label="Réinitialiser les filtres"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Réinit.
          </Link>
        )}
      </form>
    </>
  );
}
