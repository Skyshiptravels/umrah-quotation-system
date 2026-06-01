import {
  computeVendorLineCost,
  parseVendorCostBreakdown,
} from "@/lib/services/quotation-workflow-service";
import { calculateProfitFromQuotation } from "@/lib/services/financial-service";

describe("Quotation workflow helpers", () => {
  test("computeVendorLineCost for rate types", () => {
    expect(computeVendorLineCost("FLAT", 500, 10)).toBe(500);
    expect(computeVendorLineCost("PER_PAX", 100, 5, 2)).toBe(1000);
    expect(computeVendorLineCost("PER_ROOM", 200, 8, 3)).toBe(1200);
  });

  test("parseVendorCostBreakdown sums line totals", () => {
    const parsed = parseVendorCostBreakdown({
      hotel: { vendor_id: "h1", vendor_name: "Hotel A", rate_type: "FLAT", rate: 1000, quantity: 1, nights: 1, total: 1000, currency: "SAR" },
      transport: { vendor_id: "t1", vendor_name: "Trans B", rate_type: "FLAT", rate: 500, quantity: 1, nights: 1, total: 500, currency: "SAR" },
      visa: null,
      total: 1500,
    });
    expect(parsed?.total).toBe(1500);
    expect(parsed?.hotel?.vendor_name).toBe("Hotel A");
  });

  test("calculateProfitFromQuotation with staff margin", () => {
    const profit = calculateProfitFromQuotation(10000, 5000, 2000, 500, 10);
    expect(profit.revenue).toBe(10000);
    expect(profit.vendor_cost).toBe(7500);
    expect(profit.gross_profit).toBe(2500);
    expect(profit.staff_commission).toBe(250);
    expect(profit.company_profit).toBe(2250);
    expect(profit.profit_margin_percent).toBe(25);
  });
});
