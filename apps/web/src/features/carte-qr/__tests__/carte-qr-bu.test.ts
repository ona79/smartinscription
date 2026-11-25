import { describe, expect, it, vi } from "vitest";
import { ROLES } from "@smartinscription/shared";
import {
  buildCardQrPayload,
  isCardQrInput,
  recordCardCheckIn,
  renderCardQrSvg,
  verifyCardQrCode,
  verifyCardQrInDb,
} from "@/features/carte-qr/services/card-qr-service";
import { buildAcademicTableColumns } from "@/features/dossier/lib/academic-table";
import { updateRegistrationBuStatus } from "@/features/dossier/services/bu-service";
import { extractQrToken } from "@/features/scan/services/verification-service";

const TEST_SECRET = "0123456789abcdef0123456789abcdef";

describe("QR code d'identité de la carte (features/carte-qr)", () => {
  it("génère une signature déterministe sans donnée personnelle et rejette tout code modifié", async () => {
    const p1 = buildCardQrPayload({
      studentId: "stu_123",
      version: 1,
      appUrl: "https://smartinscription-apps.vercel.app",
      secret: TEST_SECRET,
    });
    const p2 = buildCardQrPayload({
      studentId: "stu_123",
      version: 1,
      appUrl: "https://smartinscription-apps.vercel.app",
      secret: TEST_SECRET,
    });

    expect(p1).toBe(p2);
    expect(p1).toContain("/verification/carte/stu_123.");
    expect(verifyCardQrCode({ code: p1, expectedVersion: 1, secret: TEST_SECRET }).valid).toBe(
      true
    );

    // Modification d'un caractère -> rejet
    const tampered = `${p1.slice(0, -1)}${p1.endsWith("A") ? "B" : "A"}`;
    expect(
      verifyCardQrCode({ code: tampered, expectedVersion: 1, secret: TEST_SECRET }).valid
    ).toBe(false);

    // Changement de cardQrVersion -> invalide l'ancien code
    expect(
      verifyCardQrCode({ code: p1, expectedVersion: 2, secret: TEST_SECRET }).valid
    ).toBe(false);

    // Rendu SVG noir sur blanc
    const svg = await renderCardQrSvg(p1);
    expect(svg).toContain("<svg");
    expect(svg).toContain("#000000");
  });

  it("refuse l'accès à un STUDENT et autorise AGENT/ADMIN", async () => {
    const payload = buildCardQrPayload({
      studentId: "stu_123",
      version: 1,
      secret: TEST_SECRET,
    });

    const mockDb = {
      student: {
        findUnique: vi.fn().mockResolvedValue({ id: "stu_123", cardQrVersion: 1 }),
      },
    } as unknown as Parameters<typeof verifyCardQrInDb>[1];

    const studentRes = await verifyCardQrInDb(
      { rawCode: payload, requesterRole: ROLES.STUDENT, secret: TEST_SECRET },
      mockDb
    );
    expect(studentRes).toEqual({ valid: false, reason: "FORBIDDEN" });

    const agentRes = await verifyCardQrInDb(
      { rawCode: payload, requesterRole: ROLES.AGENT, secret: TEST_SECRET },
      mockDb
    );
    expect(agentRes).toEqual({ valid: true, studentId: "stu_123" });
  });

  it("limite CHECK_IN à une fois par fenêtre de 30 minutes", async () => {
    const createMock = vi.fn().mockResolvedValue({});
    const findFirstMock = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "act-1" });

    const mockDb = {
      activityLog: { findFirst: findFirstMock, create: createMock },
    } as unknown as Parameters<typeof recordCardCheckIn>[1];

    const first = await recordCardCheckIn(
      { studentUserId: "u-1", registrationId: "reg-1" },
      mockDb
    );
    const second = await recordCardCheckIn(
      { studentUserId: "u-1", registrationId: "reg-1" },
      mockDb
    );

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("permet au scanner de distinguer QR de carte et QR de reçu", () => {
    const cardUrl = buildCardQrPayload({
      studentId: "stu_abc",
      version: 1,
      secret: TEST_SECRET,
    });
    expect(isCardQrInput(cardUrl)).toBe(true);
    expect(isCardQrInput("https://smartinscription-apps.vercel.app/verification/tok_xyz")).toBe(
      false
    );
    expect(extractQrToken("https://smartinscription-apps.vercel.app/verification/tok_xyz")).toBe(
      "tok_xyz"
    );
  });
});

describe("Accès BU (setBuStatus)", () => {
  it("refuse l'activation par un STUDENT et sur une inscription non payée", async () => {
    await expect(
      updateRegistrationBuStatus({
        registrationId: "reg-1",
        status: "ACTIVE",
        actorId: "u-stu",
        actorRole: ROLES.STUDENT,
      })
    ).rejects.toThrow(/Accès refusé/);

    const mockDbUnpaid = {
      registration: {
        findUnique: vi.fn().mockResolvedValue({
          id: "reg-1",
          anneeAcademique: "2026-2027",
          statut: "PENDING_PAYMENT",
          buStatus: "NONE",
          student: { user: { id: "u-1", email: "a@b.sn", prenom: "Cheikh" } },
        }),
      },
    } as unknown as Parameters<typeof updateRegistrationBuStatus>[1];

    await expect(
      updateRegistrationBuStatus(
        {
          registrationId: "reg-1",
          status: "ACTIVE",
          actorId: "u-agent",
          actorRole: ROLES.AGENT,
        },
        mockDbUnpaid
      )
    ).rejects.toThrow(/paiement/i);
  });

  it("envoie la notification d'activation BU une seule fois", async () => {
    const updateMock = vi
      .fn()
      .mockResolvedValue({ id: "reg-1", buStatus: "ACTIVE", buValidatedAt: new Date() });
    const notifCreateMock = vi.fn().mockResolvedValue({});
    const notifFindFirstMock = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "notif-1" });

    const mockDb = {
      registration: {
        findUnique: vi.fn().mockResolvedValue({
          id: "reg-1",
          anneeAcademique: "2026-2027",
          statut: "PAID",
          buStatus: "NONE",
          student: { user: { id: "u-1", email: "a@b.sn", prenom: "Cheikh" } },
        }),
        update: updateMock,
      },
      notification: {
        findFirst: notifFindFirstMock,
        create: notifCreateMock,
      },
    } as unknown as Parameters<typeof updateRegistrationBuStatus>[1];

    await updateRegistrationBuStatus(
      {
        registrationId: "reg-1",
        status: "ACTIVE",
        actorId: "u-agent",
        actorRole: ROLES.AGENT,
        skipEmail: true,
      },
      mockDb
    );
    await updateRegistrationBuStatus(
      {
        registrationId: "reg-1",
        status: "ACTIVE",
        actorId: "u-agent",
        actorRole: ROLES.AGENT,
        skipEmail: true,
      },
      mockDb
    );

    expect(notifCreateMock).toHaveBeenCalledTimes(1);
  });
});

describe("Tableau de scolarité du verso (L1, L2, L3, M1, M2)", () => {
  it("calcule 3 colonnes pour Licence, 2 pour Master et ne remplit BU que si ACTIVE", () => {
    const l1 = buildAcademicTableColumns({
      currentAcademicYear: "2026-2027",
      currentNiveau: "L1",
      registrations: [
        { anneeAcademique: "2026-2027", niveau: "L1", statut: "PAID", buStatus: "NONE" },
      ],
    });
    expect(l1.map((c) => c.anneeAcademique)).toEqual(["2026-2027", "2027-2028", "2028-2029"]);
    expect(l1[0]).toMatchObject({ scolariteLabel: "Licence 1", buActive: false, isCurrent: true });
    expect(l1[1]).toMatchObject({ scolariteLabel: "", buActive: false });

    const l3 = buildAcademicTableColumns({
      currentAcademicYear: "2026-2027",
      currentNiveau: "L3",
      registrations: [
        { anneeAcademique: "2024-2025", niveau: "L1", statut: "VALIDATED", buStatus: "ACTIVE" },
        { anneeAcademique: "2025-2026", niveau: "L2", statut: "REJECTED", buStatus: "ACTIVE" },
        { anneeAcademique: "2026-2027", niveau: "L3", statut: "VALIDATED", buStatus: "NONE" },
      ],
    });
    expect(l3.map((c) => c.anneeAcademique)).toEqual(["2024-2025", "2025-2026", "2026-2027"]);
    expect(l3[0]).toMatchObject({ scolariteLabel: "Licence 1", buActive: true });
    // REJECTED ignoré
    expect(l3[1]).toMatchObject({ scolariteLabel: "", buActive: false });
    expect(l3[2]).toMatchObject({ scolariteLabel: "Licence 3", buActive: false, isCurrent: true });

    const m2 = buildAcademicTableColumns({
      currentAcademicYear: "2026-2027",
      currentNiveau: "M2",
      registrations: [
        { anneeAcademique: "2025-2026", niveau: "M1", statut: "VALIDATED", buStatus: "ACTIVE" },
        { anneeAcademique: "2026-2027", niveau: "M2", statut: "PAID", buStatus: "NONE" },
      ],
    });
    expect(m2.map((c) => c.anneeAcademique)).toEqual(["2025-2026", "2026-2027"]);
    expect(m2[0]).toMatchObject({ scolariteLabel: "Master 1", buActive: true });
    expect(m2[1]).toMatchObject({ scolariteLabel: "Master 2", buActive: false });
  });
});
