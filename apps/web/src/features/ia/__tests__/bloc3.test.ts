import { describe, expect, it, vi } from "vitest";
import {
  evaluateDossierRules,
  triggerAnomalyAnalysis,
} from "@/features/ia/trigger-anomaly-analysis";

describe("Règles de détection d'anomalies (evaluateDossierRules)", () => {
  it("détecte paiement en double, multi-inscription, incohérence UFR et format numéro", () => {
    const flags = evaluateDossierRules({
      successPaymentsCount: 2,
      sameStudentRegistrationsCount: 2,
      studentUfrId: "ufr-1",
      filiereUfrId: "ufr-2",
      numeroEtudiant: "bad!",
    });

    expect(flags).toHaveLength(4);
  });

  it("ne signale aucune anomalie sur un dossier conforme", () => {
    const flags = evaluateDossierRules({
      successPaymentsCount: 1,
      sameStudentRegistrationsCount: 1,
      studentUfrId: "ufr-1",
      filiereUfrId: "ufr-1",
      numeroEtudiant: "SN-2026-0001",
    });

    expect(flags).toHaveLength(0);
  });
});

describe("triggerAnomalyAnalysis (Bloc 3)", () => {
  it("met à jour aiClass=SUSPECT et crée une FraudAlert sans bloquer", async () => {
    const updateRegSpy = vi.fn().mockResolvedValue({});
    const createAlertSpy = vi.fn().mockResolvedValue({});
    const mockDb = {
      registration: {
        findUnique: vi.fn().mockResolvedValue({
          id: "reg-1",
          studentId: "stu-1",
          anneeAcademique: "2026-2027",
          createdAt: new Date(),
          student: {
            userId: "user-1",
            ufrId: "ufr-1",
            numeroEtudiant: "SN-2026-0001",
            user: { lastLoginAt: new Date() },
            filiere: { ufrId: "ufr-1" },
          },
          payments: [{ id: "pay-1", montant: 1000, statut: "SUCCESS", createdAt: new Date() }],
          _count: { documents: 0 },
        }),
        count: vi.fn().mockResolvedValue(1),
        update: updateRegSpy,
      },
      activityLog: { findFirst: vi.fn().mockResolvedValue(null) },
      fraudAlert: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: createAlertSpy,
      },
    };

    const mockAnalyzer = vi.fn().mockResolvedValue({
      classification: "SUSPECT",
      anomaly_score: 0.91,
      is_anomaly: true,
      reasons: ["Montant inhabituel"],
    });

    await triggerAnomalyAnalysis("reg-1", {
      db: mockDb as never,
      analyzer: mockAnalyzer,
    });

    expect(updateRegSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "reg-1" },
        data: expect.objectContaining({ aiClass: "SUSPECT", aiScore: 0.91 }),
      })
    );
    expect(createAlertSpy).toHaveBeenCalledTimes(1);
  });
});
