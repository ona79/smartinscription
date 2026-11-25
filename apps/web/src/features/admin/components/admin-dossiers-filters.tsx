"use client";

import { useState } from "react";
import {
  REGISTRATION_STATUS_LABELS_FR,
  REGISTRATION_STATUSES,
} from "@smartinscription/shared";
import { Search, SlidersHorizontal } from "lucide-react";
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
      <div className="flex gap-2 md:hidden">
        <form method="GET" className="flex flex-1 gap-2">
          {statut && <input type="hidden" name="statut" value={statut} />}
          {ufrId && <input type="hidden" name="ufrId" value={ufrId} />}
          {aiClass && <input type="hidden" name="aiClass" value={aiClass} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Rechercher nom ou N°..."
              className="pl-9"
            />
          </div>
          <Button
            type="submit"
            className="shrink-0 rounded-lg bg-brand px-3.5 text-brand-foreground hover:bg-brand-dark"
          >
            OK
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          onClick={() => setSheetOpen(true)}
          className="relative shrink-0 rounded-lg px-3"
          aria-label="Ouvrir les filtres"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-brand-foreground">
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

      {/* Desktop : grille complète inline */}
      <form method="GET" className="hidden gap-3 md:grid md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom, prénom ou N° étudiant..."
            className="pl-9"
          />
        </div>

        <select
          name="statut"
          defaultValue={statut ?? ""}
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
          defaultValue={ufrId ?? ""}
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
            defaultValue={aiClass ?? ""}
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
            className="shrink-0 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
          >
            Filtrer
          </Button>
        </div>
      </form>
    </>
  );
}
