import { query, toNumber } from "@/lib/db";
import { getPaymentSummary } from "@/lib/services/payment-service";
import { getEnhancedFinancialSummary } from "@/lib/services/financial-service";
import { getAtRiskClients } from "@/lib/services/client-service";
import { Role } from "@/types";

export async function getDashboardMetrics(orgId: string, role: Role) {
  const today = new Date().toISOString().split("T")[0];

  const todayQuotes = await query(
    `SELECT COUNT(*) as cnt,
            COALESCE(SUM(total_cost_sar), 0) as revenue
     FROM quotations
     WHERE organization_id = $1 AND deleted_at IS NULL
       AND created_at::date = $2::date`,
    [orgId, today]
  );

  const pipeline = await query(
    `SELECT status, COUNT(*) as cnt
     FROM quotations
     WHERE organization_id = $1 AND deleted_at IS NULL
     GROUP BY status`,
    [orgId]
  );

  const pendingApproval = await query(
    `SELECT COUNT(*) as cnt FROM quotations
     WHERE organization_id = $1 AND deleted_at IS NULL AND status = 'PENDING'`,
    [orgId]
  );

  const staffPerformance = await query(
    `SELECT u.id, u.email, u.full_name, COUNT(q.id) as quote_count,
            COALESCE(SUM(q.total_cost_sar), 0) as revenue
     FROM users u
     LEFT JOIN quotations q ON q.staff_id = u.id AND q.deleted_at IS NULL
     WHERE u.organization_id = $1 AND u.deleted_at IS NULL AND u.is_active = true
     GROUP BY u.id, u.email, u.full_name
     ORDER BY revenue DESC
     LIMIT 10`,
    [orgId]
  );

  const paymentSummary = await getPaymentSummary(orgId);
  const financial = await getEnhancedFinancialSummary(orgId, 30);
  const atRisk = await getAtRiskClients(orgId);

  const vendorOutstanding = await query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM vendor_payments vp
     JOIN vendors v ON v.id = vp.vendor_id
     WHERE v.organization_id = $1 AND vp.status NOT IN ('PAID')`,
    [orgId]
  );

  const metrics = {
    quotations_today: Number(todayQuotes.rows[0].cnt),
    revenue_today: toNumber(todayQuotes.rows[0].revenue),
    pending_approval: Number(pendingApproval.rows[0].cnt),
    overdue_payments: paymentSummary.overdue_count,
    overdue_amount: paymentSummary.overdue_amount,
    vendor_outstanding: toNumber(vendorOutstanding.rows[0].total),
    gross_profit_30d: financial.total_gross_profit,
    company_profit_30d: financial.total_company_profit,
    cash_collected_30d: financial.cash_collected,
    approved_30d: financial.quotations_approved,
  };

  const pipelineMap: Record<string, number> = {};
  for (const row of pipeline.rows) {
    pipelineMap[row.status] = Number(row.cnt);
  }

  const data = {
    metrics,
    pipeline: pipelineMap,
    payments: paymentSummary,
    financial: {
      total_revenue: financial.total_revenue,
      total_gross_profit: financial.total_gross_profit,
      total_company_profit: financial.total_company_profit,
      avg_margin: financial.avg_profit_margin,
      cash_collected: financial.cash_collected,
      daily: financial.daily_breakdown.slice(-7),
    },
    staff_performance: staffPerformance.rows.map((s) => ({
      id: s.id,
      name: s.full_name || s.email,
      email: s.email,
      quote_count: Number(s.quote_count),
      revenue: toNumber(s.revenue),
    })),
    alerts: {
      at_risk_clients: atRisk.length,
      expiring_quotes: pipelineMap.DRAFT || 0,
      overdue_invoices: paymentSummary.overdue_count,
    },
  };

  if (role === "STAFF" || role === "AGENT") {
    return {
      metrics: {
        quotations_today: metrics.quotations_today,
        revenue_today: metrics.revenue_today,
      },
      pipeline: { DRAFT: pipelineMap.DRAFT, PENDING: pipelineMap.PENDING },
    };
  }

  if (role === "ACCOUNTS_MANAGER") {
    return {
      metrics,
      payments: paymentSummary,
      financial: {
        total_revenue: financial.total_revenue,
        total_company_profit: financial.total_company_profit,
        daily: financial.daily_breakdown.slice(-7),
      },
      alerts: data.alerts,
    };
  }

  return data;
}
