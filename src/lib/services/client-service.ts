import { query, toNumber } from "@/lib/db";

export function normalizeClientStatus(status: string): string {
  const u = status.toUpperCase();
  if (["ACTIVE", "INACTIVE", "VIP"].includes(u)) return u;
  return "ACTIVE";
}

export function normalizePreferredContact(contact: string): string {
  const u = contact.toUpperCase();
  if (["EMAIL", "PHONE", "WHATSAPP"].includes(u)) return u;
  return "EMAIL";
}

export function computeClientMetrics(
  client: { total_bookings: number; total_spent: number; repeat_customer?: boolean },
  payments: Array<{ amount_due: number; amount_paid: number }>
) {
  const outstanding = payments.reduce(
    (s, p) => s + Math.max(0, p.amount_due - p.amount_paid),
    0
  );
  const avgSpend =
    client.total_bookings > 0 ? client.total_spent / client.total_bookings : 0;

  return {
    outstanding_balance: Math.round(outstanding * 100) / 100,
    average_spend: Math.round(avgSpend * 100) / 100,
    is_repeat: Boolean(client.repeat_customer) || client.total_bookings > 1,
  };
}

export async function listClients(
  orgId: string,
  filters?: { status?: string; search?: string }
) {
  let sql = `SELECT id, email, phone, full_name, status, total_bookings, total_spent,
                    last_booking_date, repeat_customer, assigned_staff_id, created_at
             FROM clients WHERE organization_id = $1 AND deleted_at IS NULL`;
  const params: unknown[] = [orgId];

  if (filters?.status && filters.status !== "all") {
    params.push(normalizeClientStatus(filters.status));
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.search) {
    params.push(`%${filters.search}%`);
    sql += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
  }
  sql += ` ORDER BY full_name`;

  const result = await query(sql, params);
  return result.rows.map((r) => ({
    ...r,
    total_spent: toNumber(r.total_spent),
  }));
}

export async function getClientById(id: string, orgId: string) {
  const result = await query(
    `SELECT c.*, u.full_name as assigned_staff_name
     FROM clients c
     LEFT JOIN users u ON u.id = c.assigned_staff_id
     WHERE c.id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL`,
    [id, orgId]
  );
  if (!result.rows[0]) return null;

  const quotations = await getClientQuotations(id);
  const payments = await getClientPayments(id);
  const communications = await getClientCommunications(id);
  const metrics = computeClientMetrics(
    {
      total_bookings: Number(result.rows[0].total_bookings) || 0,
      total_spent: toNumber(result.rows[0].total_spent),
      repeat_customer: Boolean(result.rows[0].repeat_customer),
    },
    payments
  );

  return {
    client: { ...result.rows[0], total_spent: toNumber(result.rows[0].total_spent) },
    quotations,
    payments,
    communications,
    balance_due: metrics.outstanding_balance,
    metrics,
  };
}

export async function getClientQuotations(clientId: string) {
  const result = await query(
    `SELECT id, customer_name, status, total_cost_sar, created_at, approved_at
     FROM quotations WHERE client_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [clientId]
  );
  return result.rows.map((r) => ({
    ...r,
    total_cost_sar: toNumber(r.total_cost_sar),
  }));
}

export async function getClientPayments(clientId: string) {
  const result = await query(
    `SELECT * FROM client_payments WHERE client_id = $1 ORDER BY created_at DESC`,
    [clientId]
  );
  return result.rows.map((p) => ({
    ...p,
    amount_due: toNumber(p.amount_due),
    amount_paid: toNumber(p.amount_paid),
    balance_due: Math.round((toNumber(p.amount_due) - toNumber(p.amount_paid)) * 100) / 100,
  }));
}

export async function getClientCommunications(clientId: string, limit = 100) {
  const result = await query(
    `SELECT cl.*, u.full_name as sent_by_name
     FROM client_communication_log cl
     LEFT JOIN users u ON u.id = cl.sent_by
     WHERE cl.client_id = $1
     ORDER BY cl.sent_at DESC
     LIMIT $2`,
    [clientId, limit]
  );
  return result.rows;
}

export async function createClient(
  orgId: string,
  userId: string,
  data: {
    email: string;
    phone: string;
    full_name: string;
    whatsapp_number?: string;
    preferred_contact?: string;
    budget_range?: string;
    preferred_dates?: string;
    travel_group_size?: number;
    special_requirements?: string;
    assigned_staff_id?: string;
    status?: string;
  }
) {
  const result = await query(
    `INSERT INTO clients (organization_id, email, phone, full_name, whatsapp_number,
      preferred_contact, budget_range, preferred_dates, travel_group_size,
      special_requirements, assigned_staff_id, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      orgId,
      data.email.toLowerCase(),
      data.phone,
      data.full_name,
      data.whatsapp_number || null,
      data.preferred_contact ? normalizePreferredContact(data.preferred_contact) : "EMAIL",
      data.budget_range || null,
      data.preferred_dates || null,
      data.travel_group_size ?? null,
      data.special_requirements || null,
      data.assigned_staff_id || null,
      data.status ? normalizeClientStatus(data.status) : "ACTIVE",
      userId,
    ]
  );
  return result.rows[0].id;
}

export async function updateClient(
  id: string,
  orgId: string,
  data: {
    full_name?: string;
    phone?: string;
    whatsapp_number?: string;
    preferred_contact?: string;
    budget_range?: string;
    preferred_dates?: string;
    travel_group_size?: number;
    special_requirements?: string;
    status?: string;
    assigned_staff_id?: string;
  }
) {
  const result = await query(
    `UPDATE clients SET
      full_name = COALESCE($1, full_name),
      phone = COALESCE($2, phone),
      whatsapp_number = COALESCE($3, whatsapp_number),
      preferred_contact = COALESCE($4, preferred_contact),
      budget_range = COALESCE($5, budget_range),
      preferred_dates = COALESCE($6, preferred_dates),
      travel_group_size = COALESCE($7, travel_group_size),
      special_requirements = COALESCE($8, special_requirements),
      status = COALESCE($9, status),
      assigned_staff_id = COALESCE($10, assigned_staff_id),
      updated_at = NOW()
     WHERE id = $11 AND organization_id = $12 AND deleted_at IS NULL
     RETURNING id`,
    [
      data.full_name,
      data.phone,
      data.whatsapp_number,
      data.preferred_contact ? normalizePreferredContact(data.preferred_contact) : null,
      data.budget_range,
      data.preferred_dates,
      data.travel_group_size,
      data.special_requirements,
      data.status ? normalizeClientStatus(data.status) : null,
      data.assigned_staff_id,
      id,
      orgId,
    ]
  );
  return result.rows[0]?.id ?? null;
}

export async function logClientCommunication(
  clientId: string,
  orgId: string,
  userId: string,
  data: {
    communication_type: string;
    subject?: string;
    message?: string;
    status?: string;
    notes?: string;
  }
) {
  const client = await query(
    `SELECT id FROM clients WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [clientId, orgId]
  );
  if (!client.rows[0]) return null;

  const result = await query(
    `INSERT INTO client_communication_log
      (client_id, communication_type, subject, message, status, sent_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      clientId,
      data.communication_type.toUpperCase(),
      data.subject || null,
      data.message || null,
      (data.status || "SENT").toUpperCase(),
      userId,
      data.notes || null,
    ]
  );
  return result.rows[0];
}

export async function refreshClientStatsFromQuotation(quotationId: string) {
  const q = await query(
    `SELECT client_id FROM quotations WHERE id = $1 AND deleted_at IS NULL`,
    [quotationId]
  );
  const clientId = q.rows[0]?.client_id;
  if (!clientId) return;

  await query(
    `UPDATE clients SET
      total_bookings = (
        SELECT COUNT(*)::int FROM quotations
        WHERE client_id = $1 AND status = 'APPROVED' AND deleted_at IS NULL
      ),
      total_spent = (
        SELECT COALESCE(SUM(total_cost_sar), 0) FROM quotations
        WHERE client_id = $1 AND status = 'APPROVED' AND deleted_at IS NULL
      ),
      last_booking_date = CURRENT_DATE,
      repeat_customer = (
        SELECT COUNT(*) > 1 FROM quotations
        WHERE client_id = $1 AND status = 'APPROVED' AND deleted_at IS NULL
      ),
      updated_at = NOW()
     WHERE id = $1`,
    [clientId]
  );
}

export async function findOrSuggestClientByContact(
  orgId: string,
  email?: string,
  phone?: string
) {
  if (!email && !phone) return null;
  const result = await query(
    `SELECT id, full_name, email, phone, whatsapp_number, preferred_contact,
            budget_range, travel_group_size
     FROM clients
     WHERE organization_id = $1 AND deleted_at IS NULL
       AND (($2::text IS NOT NULL AND email = LOWER($2)) OR ($3::text IS NOT NULL AND phone = $3))
     LIMIT 1`,
    [orgId, email?.toLowerCase() || null, phone || null]
  );
  return result.rows[0] ?? null;
}

export async function getAtRiskClients(orgId: string) {
  const result = await query(
    `SELECT id, full_name, email, last_booking_date, total_spent
     FROM clients
     WHERE organization_id = $1 AND deleted_at IS NULL
       AND total_bookings > 0
       AND (last_booking_date IS NULL OR last_booking_date < CURRENT_DATE - INTERVAL '180 days')
     ORDER BY last_booking_date ASC NULLS FIRST`,
    [orgId]
  );
  return result.rows;
}
