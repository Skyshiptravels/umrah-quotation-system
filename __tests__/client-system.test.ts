import {
  computeClientMetrics,
  normalizeClientStatus,
  normalizePreferredContact,
} from "@/lib/services/client-service";

describe("Client service helpers", () => {
  test("normalizeClientStatus maps lowercase to uppercase", () => {
    expect(normalizeClientStatus("active")).toBe("ACTIVE");
    expect(normalizeClientStatus("inactive")).toBe("INACTIVE");
    expect(normalizeClientStatus("vip")).toBe("VIP");
    expect(normalizeClientStatus("unknown")).toBe("ACTIVE");
  });

  test("normalizePreferredContact", () => {
    expect(normalizePreferredContact("email")).toBe("EMAIL");
    expect(normalizePreferredContact("whatsapp")).toBe("WHATSAPP");
    expect(normalizePreferredContact("phone")).toBe("PHONE");
  });

  test("computeClientMetrics calculates outstanding and repeat flag", () => {
    const metrics = computeClientMetrics(
      { total_bookings: 2, total_spent: 10000, repeat_customer: true },
      [
        { amount_due: 5000, amount_paid: 2000 },
        { amount_due: 3000, amount_paid: 3000 },
      ]
    );

    expect(metrics.outstanding_balance).toBe(3000);
    expect(metrics.average_spend).toBe(5000);
    expect(metrics.is_repeat).toBe(true);
  });

  test("computeClientMetrics handles no bookings", () => {
    const metrics = computeClientMetrics({ total_bookings: 0, total_spent: 0 }, []);
    expect(metrics.average_spend).toBe(0);
    expect(metrics.outstanding_balance).toBe(0);
    expect(metrics.is_repeat).toBe(false);
  });
});
