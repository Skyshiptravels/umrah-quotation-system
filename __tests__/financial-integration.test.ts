import { calculateProfitFromQuotation } from "@/lib/services/financial-service";
import {
  parseVendorCostBreakdown,
  computeVendorLineCost,
} from "@/lib/services/quotation-workflow-service";

function derivePaymentStatus(amountPaid: number, amountDue: number) {
  if (amountPaid >= amountDue) return "PAID";
  if (amountPaid > 0) return "PARTIAL";
  return "PENDING";
}

function aggregateFinancialSummary(
  transactions: Array<{
    revenue_amount: number;
    vendor_cost_amount: number;
    gross_profit: number;
    staff_commission_amount: number;
    company_profit: number;
    revenue_received?: boolean;
  }>
) {
  const total_revenue = transactions.reduce((s, t) => s + t.revenue_amount, 0);
  const total_vendor_cost = transactions.reduce((s, t) => s + t.vendor_cost_amount, 0);
  const total_gross_profit = transactions.reduce((s, t) => s + t.gross_profit, 0);
  const total_commission = transactions.reduce((s, t) => s + t.staff_commission_amount, 0);
  const total_company_profit = transactions.reduce((s, t) => s + t.company_profit, 0);
  const cash_collected = transactions
    .filter((t) => t.revenue_received)
    .reduce((s, t) => s + t.revenue_amount, 0);

  return {
    total_revenue,
    total_vendor_cost,
    total_gross_profit,
    total_commission,
    total_company_profit,
    quotations_approved: transactions.length,
    avg_profit_margin:
      total_revenue > 0 ? Math.round((total_gross_profit / total_revenue) * 10000) / 100 : 0,
    cash_collected,
  };
}

describe("Financial Integration", () => {
  test("records profit from vendor breakdown on approval", () => {
    const breakdown = parseVendorCostBreakdown({
      hotel: {
        vendor_id: "h1",
        vendor_name: "Hotel",
        rate_type: "PER_ROOM",
        rate: 200,
        quantity: 2,
        nights: 5,
        total: computeVendorLineCost("PER_ROOM", 200, 5, 2),
        currency: "SAR",
      },
      transport: {
        vendor_id: "t1",
        vendor_name: "Transport",
        rate_type: "FLAT",
        rate: 1500,
        quantity: 1,
        nights: 1,
        total: 1500,
        currency: "SAR",
      },
      visa: {
        vendor_id: "v1",
        vendor_name: "Visa",
        rate_type: "PER_PAX",
        rate: 300,
        quantity: 4,
        nights: 1,
        total: 1200,
        currency: "SAR",
      },
      total: 4700,
    });

    expect(breakdown?.total).toBe(4700);

    const profit = calculateProfitFromQuotation(12000, 2000, 1500, 1200, 10);
    expect(profit.revenue).toBe(12000);
    expect(profit.vendor_cost).toBe(4700);
    expect(profit.gross_profit).toBe(7300);
    expect(profit.staff_commission).toBe(730);
    expect(profit.company_profit).toBe(6570);
  });

  test("aggregates financial summary totals", () => {
    const summary = aggregateFinancialSummary([
      {
        revenue_amount: 10000,
        vendor_cost_amount: 6000,
        gross_profit: 4000,
        staff_commission_amount: 400,
        company_profit: 3600,
        revenue_received: false,
      },
      {
        revenue_amount: 8000,
        vendor_cost_amount: 5000,
        gross_profit: 3000,
        staff_commission_amount: 300,
        company_profit: 2700,
        revenue_received: true,
      },
    ]);

    expect(summary.total_revenue).toBe(18000);
    expect(summary.total_company_profit).toBe(6300);
    expect(summary.quotations_approved).toBe(2);
    expect(summary.avg_profit_margin).toBeCloseTo(38.89, 1);
    expect(summary.cash_collected).toBe(8000);
  });

  test("derives payment status for record payment workflow", () => {
    expect(derivePaymentStatus(0, 10000)).toBe("PENDING");
    expect(derivePaymentStatus(5000, 10000)).toBe("PARTIAL");
    expect(derivePaymentStatus(10000, 10000)).toBe("PAID");
  });

  test("marks revenue received only on full payment", () => {
    const shouldMarkReceived = (paid: number, due: number) => paid >= due;
    expect(shouldMarkReceived(5000, 10000)).toBe(false);
    expect(shouldMarkReceived(10000, 10000)).toBe(true);
  });
});
