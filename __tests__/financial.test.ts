import { calculateProfitFromQuotation } from "@/lib/services/financial-service";

describe("Financial profit calculation", () => {
  test("calculates gross profit and staff commission", () => {
    const result = calculateProfitFromQuotation(10000, 5000, 1500, 800, 10);
    expect(result.revenue).toBe(10000);
    expect(result.vendor_cost).toBe(7300);
    expect(result.gross_profit).toBe(2700);
    expect(result.staff_commission).toBe(270);
    expect(result.company_profit).toBe(2430);
    expect(result.profit_margin_percent).toBe(27);
  });

  test("handles zero revenue", () => {
    const result = calculateProfitFromQuotation(0, 0, 0, 0, 10);
    expect(result.profit_margin_percent).toBe(0);
    expect(result.company_profit).toBe(0);
  });
});
