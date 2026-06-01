import { query, toNumber } from "@/lib/db";
import { getStaffCommissions } from "@/lib/services/commission-service";

export async function listStaffHr(orgId: string) {
  const result = await query(
    `SELECT id, email, full_name, role, position, base_salary, staff_margin_percent,
            hire_date, is_active
     FROM users WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY full_name NULLS LAST, email`,
    [orgId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    full_name: r.full_name || r.email.split("@")[0],
    role: r.role,
    position: r.position,
    base_salary: toNumber(r.base_salary),
    staff_margin_percent: toNumber(r.staff_margin_percent),
    is_active: r.is_active,
  }));
}

export async function processMonthlyPayroll(orgId: string, monthYear: string) {
  const staff = await listStaffHr(orgId);
  const active = staff.filter((s) => s.is_active && s.role !== "VIEWER");
  const created: string[] = [];

  for (const s of active) {
    const { stats } = await getStaffCommissions(s.id);
    const commission = stats.monthlyEarnings;
    const base = s.base_salary || 0;
    const gross = base + commission;
    const tax = Math.round(gross * 0.05 * 100) / 100;
    const net = Math.round((gross - tax) * 100) / 100;

    await query(
      `INSERT INTO payroll (organization_id, staff_id, month_year, base_salary,
        commission_earned, gross_pay, tax, total_deductions, net_pay)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (staff_id, month_year) DO UPDATE SET
         base_salary = EXCLUDED.base_salary,
         commission_earned = EXCLUDED.commission_earned,
         gross_pay = EXCLUDED.gross_pay,
         tax = EXCLUDED.tax,
         total_deductions = EXCLUDED.total_deductions,
         net_pay = EXCLUDED.net_pay,
         updated_at = NOW()`,
      [orgId, s.id, monthYear, base, commission, gross, tax, tax, net]
    );
    created.push(s.email);
  }

  return { processed: created.length, staff: created };
}

export async function getPayrollForMonth(orgId: string, monthYear: string) {
  const result = await query(
    `SELECT p.*, u.email, u.full_name, u.position
     FROM payroll p
     JOIN users u ON u.id = p.staff_id
     WHERE p.organization_id = $1 AND p.month_year = $2
     ORDER BY u.email`,
    [orgId, monthYear]
  );
  return result.rows.map((r) => ({
    ...r,
    base_salary: toNumber(r.base_salary),
    commission_earned: toNumber(r.commission_earned),
    gross_pay: toNumber(r.gross_pay),
    net_pay: toNumber(r.net_pay),
    full_name: r.full_name || r.email.split("@")[0],
  }));
}
