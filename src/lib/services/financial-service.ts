import { query, toNumber } from "@/lib/db";

export interface ProfitBreakdown {
  revenue: number;
  vendor_cost: number;
  gross_profit: number;
  profit_margin_percent: number;
  staff_commission: number;
  company_profit: number;
}

export function calculateProfitFromQuotation(
  totalCostSar: number,
  hotelCost: number,
  transportCost: number,
  visaCost: number,
  staffMarginPercent: number
): ProfitBreakdown {
  const revenue = totalCostSar;
  const vendorCost = hotelCost + transportCost + visaCost;
  const grossProfit = Math.round((revenue - vendorCost) * 100) / 100;
  const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;
  const staffCommission =
    Math.round(((grossProfit * staffMarginPercent) / 100) * 100) / 100;
  const companyProfit = Math.round((grossProfit - staffCommission) * 100) / 100;

  return {
    revenue,
    vendor_cost: vendorCost,
    gross_profit: grossProfit,
    profit_margin_percent: margin,
    staff_commission: staffCommission,
    company_profit: companyProfit,
  };
}

export async function recordFinancialTransaction(
  orgId: string,
  quotationId: string,
  breakdown: ProfitBreakdown,
  vendorCostItems: Record<string, unknown>,
  clientId?: string | null
) {
  const existing = await query(
    `SELECT id FROM financial_transactions WHERE quotation_id = $1`,
    [quotationId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const result = await query(
    `INSERT INTO financial_transactions (
      organization_id, quotation_id, client_id, revenue_amount, revenue_received,
      vendor_cost_amount, vendor_cost_items, gross_profit, profit_margin_percent,
      staff_commission_amount, company_profit
    ) VALUES ($1,$2,$3,$4,false,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      orgId,
      quotationId,
      clientId || null,
      breakdown.revenue,
      breakdown.vendor_cost,
      JSON.stringify(vendorCostItems),
      breakdown.gross_profit,
      breakdown.profit_margin_percent,
      breakdown.staff_commission,
      breakdown.company_profit,
    ]
  );

  await upsertDailySummary(orgId, new Date());
  return result.rows[0];
}

export async function markRevenueReceivedForQuotation(quotationId: string, orgId: string) {
  const result = await query(
    `UPDATE financial_transactions SET revenue_received = true
     WHERE quotation_id = $1 AND organization_id = $2
     RETURNING id`,
    [quotationId, orgId]
  );
  return result.rows[0] ?? null;
}

async function upsertDailySummary(orgId: string, date: Date) {
  const dateStr = date.toISOString().split("T")[0];
  const agg = await query(
    `SELECT
       COALESCE(SUM(revenue_amount), 0) as revenue,
       COALESCE(SUM(vendor_cost_amount), 0) as vendor_cost,
       COALESCE(SUM(gross_profit), 0) as gross_profit,
       COALESCE(SUM(staff_commission_amount), 0) as commission,
       COALESCE(SUM(company_profit), 0) as company_profit,
       COUNT(*) as cnt,
       COALESCE(AVG(profit_margin_percent), 0) as avg_margin
     FROM financial_transactions
     WHERE organization_id = $1 AND transaction_date = $2`,
    [orgId, dateStr]
  );
  const r = agg.rows[0];

  await query(
    `INSERT INTO profit_summary (
      organization_id, summary_date, daily_revenue, daily_vendor_cost,
      daily_gross_profit, daily_commission, daily_company_profit,
      quotations_count, average_margin_percent
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (organization_id, summary_date) DO UPDATE SET
      daily_revenue = EXCLUDED.daily_revenue,
      daily_vendor_cost = EXCLUDED.daily_vendor_cost,
      daily_gross_profit = EXCLUDED.daily_gross_profit,
      daily_commission = EXCLUDED.daily_commission,
      daily_company_profit = EXCLUDED.daily_company_profit,
      quotations_count = EXCLUDED.quotations_count,
      average_margin_percent = EXCLUDED.average_margin_percent,
      updated_at = NOW()`,
    [
      orgId,
      dateStr,
      toNumber(r.revenue),
      toNumber(r.vendor_cost),
      toNumber(r.gross_profit),
      toNumber(r.commission),
      toNumber(r.company_profit),
      Number(r.cnt),
      toNumber(r.avg_margin),
    ]
  );
}

export async function getEnhancedFinancialSummary(orgId: string, days = 30) {
  const txTotals = await query(
    `SELECT
       COALESCE(SUM(revenue_amount), 0) as total_revenue,
       COALESCE(SUM(vendor_cost_amount), 0) as total_vendor_cost,
       COALESCE(SUM(gross_profit), 0) as total_gross_profit,
       COALESCE(SUM(staff_commission_amount), 0) as total_commission,
       COALESCE(SUM(company_profit), 0) as total_company_profit,
       COUNT(*) as quotations_approved,
       COALESCE(AVG(profit_margin_percent), 0) as avg_profit_margin,
       COUNT(*) FILTER (WHERE revenue_received) as revenue_received_count,
       COALESCE(SUM(revenue_amount) FILTER (WHERE revenue_received), 0) as cash_collected
     FROM financial_transactions
     WHERE organization_id = $1
       AND transaction_date >= CURRENT_DATE - $2::int`,
    [orgId, days]
  );

  const quoteTotals = await query(
    `SELECT COUNT(*) as quotation_count
     FROM quotations
     WHERE organization_id = $1 AND deleted_at IS NULL
       AND created_at >= NOW() - ($2 || ' days')::interval`,
    [orgId, days]
  );

  const daily = await query(
    `SELECT summary_date, daily_revenue, daily_vendor_cost, daily_gross_profit,
            daily_commission, daily_company_profit, quotations_count, average_margin_percent
     FROM profit_summary
     WHERE organization_id = $1
       AND summary_date >= CURRENT_DATE - $2::int
     ORDER BY summary_date DESC`,
    [orgId, days]
  );

  const t = txTotals.rows[0];
  const totalRevenue = toNumber(t.total_revenue);
  const totalGross = toNumber(t.total_gross_profit);

  return {
    total_revenue: totalRevenue,
    total_vendor_cost: toNumber(t.total_vendor_cost),
    total_gross_profit: totalGross,
    total_commission: toNumber(t.total_commission),
    total_company_profit: toNumber(t.total_company_profit),
    quotations_count: Number(quoteTotals.rows[0].quotation_count),
    quotations_approved: Number(t.quotations_approved),
    avg_profit_margin:
      totalRevenue > 0
        ? Math.round((totalGross / totalRevenue) * 10000) / 100
        : toNumber(t.avg_profit_margin),
    revenue_received_count: Number(t.revenue_received_count),
    cash_collected: toNumber(t.cash_collected),
    daily_breakdown: daily.rows.map((d) => ({
      date: d.summary_date,
      revenue: toNumber(d.daily_revenue),
      cost: toNumber(d.daily_vendor_cost),
      gross_profit: toNumber(d.daily_gross_profit),
      commission: toNumber(d.daily_commission),
      company_profit: toNumber(d.daily_company_profit),
      quote_count: Number(d.quotations_count),
      margin: toNumber(d.average_margin_percent),
    })),
  };
}

export async function getFinancialReports(orgId: string, days = 30) {
  const summary = await getEnhancedFinancialSummary(orgId, days);

  const byClient = await query(
    `SELECT c.full_name, c.email,
            COUNT(ft.id) as tx_count,
            COALESCE(SUM(ft.revenue_amount), 0) as revenue,
            COALESCE(SUM(ft.company_profit), 0) as company_profit
     FROM financial_transactions ft
     LEFT JOIN clients c ON c.id = ft.client_id
     WHERE ft.organization_id = $1
       AND ft.transaction_date >= CURRENT_DATE - $2::int
     GROUP BY c.id, c.full_name, c.email
     ORDER BY revenue DESC
     LIMIT 20`,
    [orgId, days]
  );

  const outstanding = await query(
    `SELECT COALESCE(SUM(amount_due - amount_paid), 0) as client_outstanding
     FROM client_payments WHERE organization_id = $1 AND status NOT IN ('PAID')`,
    [orgId]
  );

  const vendorDue = await query(
    `SELECT COALESCE(SUM(vp.amount), 0) as vendor_outstanding
     FROM vendor_payments vp
     JOIN vendors v ON v.id = vp.vendor_id
     WHERE v.organization_id = $1 AND vp.status NOT IN ('PAID')`,
    [orgId]
  );

  return {
    summary,
    top_clients: byClient.rows.map((r) => ({
      name: r.full_name || "Unknown",
      email: r.email,
      transactions: Number(r.tx_count),
      revenue: toNumber(r.revenue),
      company_profit: toNumber(r.company_profit),
    })),
    outstanding: {
      client_payments: toNumber(outstanding.rows[0].client_outstanding),
      vendor_payments: toNumber(vendorDue.rows[0].vendor_outstanding),
    },
  };
}

export async function listInvoices(orgId: string, limit = 100) {
  const result = await query(
    `SELECT i.*, q.customer_name, c.full_name as client_name
     FROM invoices i
     JOIN quotations q ON q.id = i.quotation_id
     LEFT JOIN clients c ON c.id = i.client_id
     WHERE q.organization_id = $1
     ORDER BY i.created_at DESC
     LIMIT $2`,
    [orgId, limit]
  );
  return result.rows.map((r) => ({
    ...r,
    total_amount_sar: toNumber(r.total_amount_sar),
  }));
}

/** @deprecated Use getEnhancedFinancialSummary for dashboard UI */
export async function getFinancialSummary(orgId: string, days = 30) {
  const enhanced = await getEnhancedFinancialSummary(orgId, days);
  return {
    daily: enhanced.daily_breakdown
      .slice()
      .reverse()
      .map((d) => ({
        date: d.date,
        revenue: d.revenue,
        gross_profit: d.gross_profit,
        company_profit: d.company_profit,
        quotations: d.quote_count,
        margin: d.margin,
      })),
    period_totals: {
      revenue: enhanced.total_revenue,
      quotations: enhanced.quotations_count,
      approved: enhanced.quotations_approved,
      gross_profit: enhanced.total_gross_profit,
      company_profit: enhanced.total_company_profit,
      vendor_cost: enhanced.total_vendor_cost,
      commission: enhanced.total_commission,
      cash_collected: enhanced.cash_collected,
    },
  };
}
