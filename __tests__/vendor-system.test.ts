import {
  computeVendorPerformance,
  normalizePaymentTerms,
  normalizeVendorType,
} from "@/lib/services/vendor-service";

describe("Vendor service helpers", () => {
  test("normalizeVendorType maps lowercase to uppercase", () => {
    expect(normalizeVendorType("hotel")).toBe("HOTEL");
    expect(normalizeVendorType("transport")).toBe("TRANSPORT");
    expect(normalizeVendorType("unknown")).toBe("OTHER");
  });

  test("normalizePaymentTerms", () => {
    expect(normalizePaymentTerms("net_30")).toBe("NET_30");
    expect(normalizePaymentTerms("upfront")).toBe("UPFRONT");
  });

  test("computeVendorPerformance calculates outstanding and on-time", () => {
    const perf = computeVendorPerformance(
      [
        {
          id: "1",
          vendor_id: "v1",
          rate_type: "FLAT",
          amount: 500,
          currency: "SAR",
          valid_from: null,
          valid_to: null,
          version_number: 1,
          is_current: true,
          created_at: "2026-01-01",
        },
      ],
      [
        {
          id: "p1",
          invoice_number: "INV-1",
          amount: 1000,
          currency: "SAR",
          due_date: "2026-06-01",
          paid_date: "2026-05-28",
          payment_method: null,
          status: "PAID",
          notes: null,
          created_at: "2026-05-01",
        },
        {
          id: "p2",
          invoice_number: "INV-2",
          amount: 2000,
          currency: "SAR",
          due_date: "2026-07-01",
          paid_date: null,
          payment_method: null,
          status: "PENDING",
          notes: null,
          created_at: "2026-06-01",
        },
      ]
    );

    expect(perf.current_rate).toBe(500);
    expect(perf.outstanding_balance).toBe(2000);
    expect(perf.paid_on_time_percent).toBe(100);
    expect(perf.total_payments).toBe(2);
  });
});
