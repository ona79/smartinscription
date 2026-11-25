import { describe, expect, it } from "vitest";
import {
  buildDossiersWhereClause,
  computeActiveQueueCount,
} from "@/features/admin/queries";

describe("Requêtes Admin (Bloc 2)", () => {
  it("calcule la file active du jour", () => {
    expect(computeActiveQueueCount(12, 5)).toBe(17);
  });

  it("construit correctement les filtres de /admin/dossiers", () => {
    const where = buildDossiersWhereClause({
      statut: "PAID",
      ufrId: "ufr-1",
      aiClass: "SUSPECT",
      q: "SN-2026",
    });

    expect(where.statut).toBe("PAID");
    expect(where.aiClass).toBe("SUSPECT");
    expect(where.student).toMatchObject({
      ufrId: "ufr-1",
    });
  });
});
