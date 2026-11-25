import {
  ACADEMIC_LEVEL_LABELS_FR,
  type AcademicLevel,
} from "@smartinscription/shared";

export interface AcademicTableRegistration {
  anneeAcademique: string;
  niveau: string | null;
  statut: string;
  buStatus: "NONE" | "ACTIVE";
}

export interface AcademicTableColumn {
  anneeAcademique: string;
  isCurrent: boolean;
  scolariteLabel: string;
  buActive: boolean;
}

const LEVEL_TEXT_FR: Record<string, string> = {
  L1: "Licence 1",
  L2: "Licence 2",
  L3: "Licence 3",
  M1: "Master 1",
  M2: "Master 2",
};

const LEVEL_RANK: Record<string, { cycle: "LICENCE" | "MASTER"; rank: number }> = {
  L1: { cycle: "LICENCE", rank: 1 },
  L2: { cycle: "LICENCE", rank: 2 },
  L3: { cycle: "LICENCE", rank: 3 },
  M1: { cycle: "MASTER", rank: 1 },
  M2: { cycle: "MASTER", rank: 2 },
};

export function formatCursusLine(niveau: string, filiereName: string): string {
  const info = LEVEL_RANK[niveau];
  const prefix = info?.cycle === "MASTER" ? "Master" : "Licence";
  return `${prefix} ${filiereName.toLowerCase()}`;
}

/**
 * Calcule les colonnes du tableau de scolarité du verso de la carte étudiante :
 * - 3 colonnes pour Licence (L1..L3), 2 colonnes pour Master (M1..M2) ;
 * - année de départ = année courante - (rang du niveau - 1) ;
 * - SCOLARITÉ = niveau de `Registration.niveau` (hors REJECTED) ;
 * - BU = "Active" uniquement si `buStatus === "ACTIVE"`.
 */
export function buildAcademicTableColumns(params: {
  currentAcademicYear: string;
  currentNiveau: string;
  registrations: AcademicTableRegistration[];
}): AcademicTableColumn[] {
  const info = LEVEL_RANK[params.currentNiveau] ?? { cycle: "LICENCE", rank: 1 };
  const totalCols = info.cycle === "MASTER" ? 2 : 3;

  const startYearMatch = /^(\d{4})-(\d{4})$/.exec(params.currentAcademicYear.trim());
  const currentStartYear = startYearMatch ? Number(startYearMatch[1]) : 2026;
  const firstStartYear = currentStartYear - (info.rank - 1);

  const byYear = new Map<string, AcademicTableRegistration>();
  for (const reg of params.registrations) {
    if (reg.statut !== "REJECTED") {
      byYear.set(reg.anneeAcademique, reg);
    }
  }

  return Array.from({ length: totalCols }, (_, index) => {
    const start = firstStartYear + index;
    const year = `${start}-${start + 1}`;
    const reg = byYear.get(year);
    const niveauKey = reg?.niveau ?? "";
    const scolariteLabel = reg && niveauKey
      ? (LEVEL_TEXT_FR[niveauKey] ??
          ACADEMIC_LEVEL_LABELS_FR[niveauKey as AcademicLevel] ??
          niveauKey)
      : "";

    return {
      anneeAcademique: year,
      isCurrent: year === params.currentAcademicYear,
      scolariteLabel,
      buActive: Boolean(reg && reg.buStatus === "ACTIVE"),
    };
  });
}
