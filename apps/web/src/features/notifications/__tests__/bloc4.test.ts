import { describe, expect, it, vi } from "vitest";
import { MockSmsProvider } from "@/features/notifications/providers/sms-provider";
import {
  computeReminderDaysLeft,
  notifyAppointmentScheduled,
  notifyDossierIncomplete,
  notifyPaymentConfirmed,
  notifyRegistrationValidated,
  sendClosingReminders,
} from "@/features/notifications/services/triggers";
import {
  generateAvailableSlots,
  pickLeastLoadedSlot,
} from "@/features/rendez-vous/services/appointment-service";

describe("Déclencheurs de notifications (Bloc 4)", () => {
  it("appelle notify pour les 4 événements métier", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const base = { userId: "u1", email: "a@b.sn", prenom: "Awa" };

    await notifyPaymentConfirmed({ ...base, receiptNumber: "REC-2026-000001" }, spy);
    await notifyAppointmentScheduled({ ...base, formattedSlot: "lundi 10h" }, spy);
    await notifyDossierIncomplete({ ...base, reason: "Photo floue" }, spy);
    await notifyRegistrationValidated(base, spy);

    expect(spy).toHaveBeenCalledTimes(4);
  });

  it("envoie les rappels J-7, J-3, J-1 de manière idempotente", async () => {
    const now = new Date("2026-12-08T10:00:00.000Z");
    expect(computeReminderDaysLeft("2026-12-15", now)).toBe(7);
    expect(computeReminderDaysLeft("2026-12-10", now)).toBeNull();

    const notifySpy = vi.fn().mockResolvedValue(undefined);
    const mockDb = {
      registration: {
        findMany: vi.fn().mockResolvedValue([
          { student: { user: { id: "u1", email: "u1@sn", prenom: "Awa" } } },
          { student: { user: { id: "u2", email: "u2@sn", prenom: "Cheikh" } } },
        ]),
      },
      notification: {
        // u1 a déjà reçu [J-7], u2 non
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: "existing" })
          .mockResolvedValueOnce(null),
      },
    };

    const res = await sendClosingReminders(
      { closeDateIso: "2026-12-15", now },
      { db: mockDb as never, notifyFn: notifySpy }
    );

    expect(res.daysLeft).toBe(7);
    expect(res.sentCount).toBe(1);
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it("fournit un MockSmsProvider fonctionnel", async () => {
    const sms = new MockSmsProvider();
    const res = await sms.sendSms({ to: "+221770000000", message: "Test" });
    expect(res.sent).toBe(true);
  });
});

describe("Attribution intelligente des créneaux (Bloc 4)", () => {
  it("sélectionne le créneau le moins chargé et respecte slotCapacity", () => {
    const mondayMorning = new Date(2026, 10, 30, 8, 0, 0, 0);
    const busy9h = new Date(2026, 10, 30, 9, 0, 0, 0);

    // Capacité 2 : 9h a 1 réservation, 9h30 a 0 réservation
    const slots = generateAvailableSlots([busy9h], mondayMorning, [], 2);
    const nineAm = slots.find((s) => s.startIso === busy9h.toISOString());
    expect(nineAm).toBeDefined();
    expect(nineAm?.loadScore).toBe(1);

    const best = pickLeastLoadedSlot(slots);
    expect(best?.loadScore).toBe(0);
    expect(best?.recommended).toBe(true);
  });
});
