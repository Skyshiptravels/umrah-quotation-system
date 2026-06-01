import { query, toNumber } from "@/lib/db";
import { calculateStaffMargin } from "@/lib/calculations/quotation";

const DEFAULT_MARGIN_PERCENT = 10;

export async function upsertStaffCommission(quotationId: string): Promise<void> {
  const result = await query(
    `SELECT id, staff_id, total_cost_sar, status FROM quotations WHERE id = $1`,
    [quotationId]
  );
  const q = result.rows[0];
  if (!q?.staff_id) return;

  const totalSar = toNumber(q.total_cost_sar);
  if (totalSar <= 0) return;

  const staffRow = await query(
    `SELECT staff_margin_percent FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [q.staff_id]
  );
  const marginPercent =
    toNumber(staffRow.rows[0]?.staff_margin_percent) || DEFAULT_MARGIN_PERCENT;

  const amount = calculateStaffMargin(totalSar, marginPercent);

  const existing = await query(
    `SELECT id FROM staff_commissions WHERE quotation_id = $1 AND staff_id = $2`,
    [quotationId, q.staff_id]
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE staff_commissions SET
        commission_amount_sar = $1,
        status = CASE WHEN status = 'PAID' THEN status ELSE 'PENDING' END,
        updated_at = NOW()
       WHERE quotation_id = $2 AND staff_id = $3`,
      [amount, quotationId, q.staff_id]
    );
  } else {
    await query(
      `INSERT INTO staff_commissions (staff_id, quotation_id, commission_amount_sar, status)
       VALUES ($1, $2, $3, 'PENDING')`,
      [q.staff_id, quotationId, amount]
    );
  }
}

export interface CommissionRow {
  id: string;
  staff_id: string;
  quotation_id: string;
  commission_amount_sar: string;
  status: string;
  created_at: string;
  customer_name?: string;
  total_cost_sar?: string;
  total_cost_pkr?: string;
}

export async function getStaffCommissions(staffId: string): Promise<{
  commissions: CommissionRow[];
  stats: { monthlyEarnings: number; yearToDateEarnings: number; totalQuotations: number };
}> {
  const result = await query<CommissionRow>(
    `SELECT sc.*, q.customer_name, q.total_cost_sar, q.total_cost_pkr
     FROM staff_commissions sc
     JOIN quotations q ON q.id = sc.quotation_id
     WHERE sc.staff_id = $1 AND q.deleted_at IS NULL
     ORDER BY sc.created_at DESC`,
    [staffId]
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  let monthlyEarnings = 0;
  let yearToDateEarnings = 0;

  for (const row of result.rows) {
    const amt = toNumber(row.commission_amount_sar);
    const created = new Date(row.created_at);
    if (created >= monthStart) monthlyEarnings += amt;
    if (created >= yearStart) yearToDateEarnings += amt;
  }

  return {
    commissions: result.rows,
    stats: {
      monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
      yearToDateEarnings: Math.round(yearToDateEarnings * 100) / 100,
      totalQuotations: result.rows.length,
    },
  };
}

export async function getAdminCommissionsSummary(): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    monthly_earnings: number;
    yearly_earnings: number;
    quotation_count: number;
    commissions: CommissionRow[];
  }>
> {
  const result = await query<CommissionRow & { staff_email: string }>(
    `SELECT sc.*, q.customer_name, q.total_cost_sar, q.total_cost_pkr,
            u.email as staff_email
     FROM staff_commissions sc
     JOIN quotations q ON q.id = sc.quotation_id
     JOIN users u ON u.id = sc.staff_id
     WHERE q.deleted_at IS NULL
     ORDER BY sc.created_at DESC`
  );

  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      commissions: CommissionRow[];
      monthly_earnings: number;
      yearly_earnings: number;
      quotation_count: number;
    }
  >();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  for (const row of result.rows) {
    if (!grouped.has(row.staff_id)) {
      grouped.set(row.staff_id, {
        id: row.staff_id,
        name: row.staff_email,
        email: row.staff_email,
        commissions: [],
        monthly_earnings: 0,
        yearly_earnings: 0,
        quotation_count: 0,
      });
    }
    const staff = grouped.get(row.staff_id)!;
    staff.commissions.push(row);
    staff.quotation_count += 1;
    const amt = toNumber(row.commission_amount_sar);
    const created = new Date(row.created_at);
    if (created >= monthStart) staff.monthly_earnings += amt;
    if (created >= yearStart) staff.yearly_earnings += amt;
  }

  return Array.from(grouped.values()).map((s) => ({
    ...s,
    monthly_earnings: Math.round(s.monthly_earnings * 100) / 100,
    yearly_earnings: Math.round(s.yearly_earnings * 100) / 100,
  }));
}
