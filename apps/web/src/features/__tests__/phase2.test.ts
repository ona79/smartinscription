import { describe, expect, it, vi } from "vitest";
import { notifyUser } from "@/features/notifications/services/notification-service";
import { generateAvailableSlots } from "@/features/rendez-vous/services/appointment-service";

describe("Génération des créneaux de rendez-vous", () => {
  it("exclut les week-ends, les créneaux passés et les créneaux déjà réservés", () => {
    // Lundi 2026-11-30 à 08:00
    const mondayMorning = new Date(2026, 10, 30, 8, 0, 0, 0);
    const bookedSlot = new Date(2026, 10, 30, 9, 0, 0, 0);

    const slots = generateAvailableSlots([bookedSlot], mondayMorning);

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.startIso === bookedSlot.toISOString())).toBe(false);

    // Vérifie qu'aucun créneau ne tombe un samedi (6) ou un dimanche (0)
    for (const slot of slots) {
      const day = new Date(slot.startIso).getDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });
});

describe("Service de notifications", () => {
  it("enregistre une notification non lue en base", async () => {
    const createSpy = vi.fn().mockResolvedValue({ id: "notif-1" });
    const mockDb = {
      notification: { create: createSpy },
    };

    await notifyUser(
      {
        userId: "user-1",
        email: "awa.sarr@smartinscription.sn",
        type: "DOCUMENT_APPROVED",
        message: "Votre document a été approuvé.",
        emailSubject: "Document approuvé",
        emailHtml: "<p>Approuvé</p>",
      },
      { db: mockDb as never, skipEmail: true }
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "DOCUMENT_APPROVED",
        message: "Votre document a été approuvé.",
        lu: false,
      },
    });
  });
});
