import { query, toNumber } from "@/lib/db";
import { markRevenueReceivedForQuotation } from "@/lib/services/financial-service";

export async function listPayments(orgId: string, status?: string) {
  let sql = `SELECT cp.*, c.full_name as client_name, c.email as client_email
             FROM client_payments cp
             JOIN clients c ON c.id = cp.client_id
             WHERE cp.organization_id = $1`;
  const params: unknown[] = [orgId];
  if (status) {
    params.push(status);
    sql += ` AND cp.status = $${params.length}`;
  }
  sql += ` ORDER BY cp.payment_due_date ASC NULLS LAST`;

  const result = await query(sql, params);
  return result.rows.map((r) => ({
    ...r,
    amount_due: toNumber(r.amount_due),
    amount_paid: toNumber(r.amount_paid),
    balance: Math.round((toNumber(r.amount_due) - toNumber(r.amount_paid)) * 100) / 100,
  }));
}

export async function getOverduePayments(orgId: string) {
  const result = await query(
    `SELECT cp.*, c.full_name as client_name, c.email as client_email,
            (CURRENT_DATE - cp.payment_due_date) as days_overdue
     FROM client_payments cp
     JOIN clients c ON c.id = cp.client_id
     WHERE cp.organization_id = $1
       AND cp.status NOT IN ('PAID')
       AND cp.payment_due_date < CURRENT_DATE
     ORDER BY cp.payment_due_date ASC`,
    [orgId]
  );
  return result.rows.map((r) => ({
    ...r,
    amount_due: toNumber(r.amount_due),
    amount_paid: toNumber(r.amount_paid),
    days_overdue: Number(r.days_overdue),
  }));
}

export async function recordPayment(
  orgId: string,
  data: {
    client_id: string;
    quotation_id?: string;
    amount_due: number;
    amount_paid?: number;
    payment_due_date?: string;
    invoice_number?: string;
  }
) {
  const paid = data.amount_paid ?? 0;
  let status = "PENDING";
  if (paid >= data.amount_due) status = "PAID";
  else if (paid > 0) status = "PARTIAL";

  const result = await query(
    `INSERT INTO client_payments (organization_id, client_id, quotation_id, invoice_number,
      amount_due, amount_paid, payment_due_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      orgId,
      data.client_id,
      data.quotation_id || null,
      data.invoice_number || null,
      data.amount_due,
      paid,
      data.payment_due_date || null,
      status,
    ]
  );
  return result.rows[0];
}

export async function markPaymentPaid(paymentId: string, orgId: string, amount?: number) {
  const existing = await query(
    `SELECT * FROM client_payments WHERE id = $1 AND organization_id = $2`,
    [paymentId, orgId]
  );
  if (!existing.rows[0]) return null;

  const due = toNumber(existing.rows[0].amount_due);
  const paid = amount ?? due;

  const result = await query(
    `UPDATE client_payments SET
      amount_paid = $1,
      status = CASE WHEN $1 >= amount_due THEN 'PAID' WHEN $1 > 0 THEN 'PARTIAL' ELSE status END,
      payment_received_date = CURRENT_DATE,
      updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [paid, paymentId]
  );

  const row = result.rows[0];
  if (row?.quotation_id && paid >= due) {
    await markRevenueReceivedForQuotation(String(row.quotation_id), orgId);
  }

  return row;
}

export async function updateClientPayment(
  paymentId: string,
  clientId: string,
  orgId: string,
  data: {
    amount_paid?: number;
    amount_due?: number;
    payment_method?: string;
    payment_received_date?: string;
    notes?: string;
  }
) {
  const existing = await query(
    `SELECT * FROM client_payments WHERE id = $1 AND client_id = $2 AND organization_id = $3`,
    [paymentId, clientId, orgId]
  );
  if (!existing.rows[0]) return null;

  const due = data.amount_due ?? toNumber(existing.rows[0].amount_due);
  const paid = data.amount_paid ?? toNumber(existing.rows[0].amount_paid);
  let status = "PENDING";
  if (paid >= due) status = "PAID";
  else if (paid > 0) status = "PARTIAL";

  const result = await query(
    `UPDATE client_payments SET
      amount_due = $1,
      amount_paid = $2,
      payment_method = COALESCE($3, payment_method),
      payment_received_date = COALESCE($4::date, payment_received_date, CASE WHEN $2 > 0 THEN CURRENT_DATE ELSE NULL END),
      status = $5,
      notes = COALESCE($6, notes),
      updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [
      due,
      paid,
      data.payment_method || null,
      data.payment_received_date || null,
      status,
      data.notes || null,
      paymentId,
    ]
  );

  const row = result.rows[0];
  if (row?.quotation_id && paid >= due) {
    await markRevenueReceivedForQuotation(String(row.quotation_id), orgId);
  }

  return {
    ...row,
    amount_due: toNumber(row.amount_due),
    amount_paid: toNumber(row.amount_paid),
    balance: Math.round((toNumber(row.amount_due) - toNumber(row.amount_paid)) * 100) / 100,
  };
}

export async function getPaymentSummary(orgId: string) {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('PAID')) as pending_count,
       COALESCE(SUM(amount_due - amount_paid) FILTER (WHERE status NOT IN ('PAID')), 0) as pending_amount,
       COUNT(*) FILTER (WHERE status NOT IN ('PAID') AND payment_due_date < CURRENT_DATE) as overdue_count,
       COALESCE(SUM(amount_due - amount_paid) FILTER (WHERE status NOT IN ('PAID') AND payment_due_date < CURRENT_DATE), 0) as overdue_amount,
       COUNT(*) FILTER (WHERE status = 'PAID' AND payment_received_date >= date_trunc('month', CURRENT_DATE)) as paid_this_month,
       COALESCE(SUM(amount_paid) FILTER (WHERE status = 'PAID' AND payment_received_date >= date_trunc('month', CURRENT_DATE)), 0) as paid_amount_month
     FROM client_payments WHERE organization_id = $1`,
    [orgId]
  );
  const r = result.rows[0];
  return {
    pending_count: Number(r.pending_count),
    pending_amount: toNumber(r.pending_amount),
    overdue_count: Number(r.overdue_count),
    overdue_amount: toNumber(r.overdue_amount),
    paid_this_month: Number(r.paid_this_month),
    paid_amount_month: toNumber(r.paid_amount_month),
  };
}
