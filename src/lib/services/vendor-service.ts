import { query, toNumber } from "@/lib/db";

export type VendorType = "HOTEL" | "TRANSPORT" | "VISA" | "AIRLINE" | "OTHER";

const TYPE_MAP: Record<string, VendorType> = {
  hotel: "HOTEL",
  transport: "TRANSPORT",
  visa: "VISA",
  airline: "AIRLINE",
  other: "OTHER",
  HOTEL: "HOTEL",
  TRANSPORT: "TRANSPORT",
  VISA: "VISA",
  AIRLINE: "AIRLINE",
  OTHER: "OTHER",
};

export function normalizeVendorType(type: string): VendorType {
  return TYPE_MAP[type] || TYPE_MAP[type.toLowerCase()] || "OTHER";
}

export function normalizePaymentTerms(terms: string): string {
  const t = terms.toUpperCase().replace(/\s+/g, "_");
  if (t === "NET_30" || t === "NET30") return "NET_30";
  if (t === "NET_60" || t === "NET60") return "NET_60";
  if (t === "UPFRONT") return "UPFRONT";
  return t;
}

export interface VendorDto {
  id: string;
  name: string;
  type: string;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms: string;
  commission_rate: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface VendorRateDto {
  id: string;
  vendor_id: string;
  rate_type: string;
  amount: number;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  version_number: number;
  is_current: boolean;
  created_at: string;
}

export interface VendorPaymentDto {
  id: string;
  invoice_number: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface VendorPerformance {
  total_rates: number;
  current_rate: number | null;
  total_payments: number;
  paid_on_time_percent: number;
  outstanding_balance: number;
  avg_payment_amount: number;
}

export async function listVendors(
  orgId: string,
  filters?: { type?: string; search?: string; activeOnly?: boolean }
) {
  let sql = `SELECT id, name, type, contact_email, contact_phone, payment_terms,
                    commission_rate, is_active, notes, created_at
             FROM vendors
             WHERE organization_id = $1 AND deleted_at IS NULL`;
  const params: unknown[] = [orgId];

  if (filters?.type && filters.type !== "all") {
    params.push(normalizeVendorType(filters.type));
    sql += ` AND type = $${params.length}`;
  }
  if (filters?.search) {
    params.push(`%${filters.search}%`);
    sql += ` AND name ILIKE $${params.length}`;
  }
  if (filters?.activeOnly) {
    sql += ` AND is_active = true`;
  }
  sql += ` ORDER BY name`;

  const result = await query(sql, params);
  return result.rows.map((r) => ({
    ...r,
    commission_rate: toNumber(r.commission_rate),
  })) as VendorDto[];
}

export async function getVendorRates(vendorId: string): Promise<VendorRateDto[]> {
  const result = await query(
    `SELECT * FROM vendor_rates WHERE vendor_id = $1 ORDER BY version_number DESC, created_at DESC`,
    [vendorId]
  );
  return result.rows.map((r) => ({
    ...r,
    amount: toNumber(r.amount),
    version_number: Number(r.version_number),
  })) as VendorRateDto[];
}

export async function getCurrentVendorRate(
  vendorId: string,
  referenceDate?: string | null
): Promise<VendorRateDto | null> {
  const ref = referenceDate || new Date().toISOString().split("T")[0];
  const result = await query(
    `SELECT * FROM vendor_rates
     WHERE vendor_id = $1 AND is_current = true
       AND (valid_from IS NULL OR valid_from <= $2::date)
       AND (valid_to IS NULL OR valid_to >= $2::date)
     ORDER BY version_number DESC LIMIT 1`,
    [vendorId, ref]
  );
  if (!result.rows[0]) {
    const fallback = await query(
      `SELECT * FROM vendor_rates WHERE vendor_id = $1 AND is_current = true
       ORDER BY version_number DESC LIMIT 1`,
      [vendorId]
    );
    if (!fallback.rows[0]) return null;
    const r = fallback.rows[0];
    return {
      ...r,
      amount: toNumber(r.amount),
      version_number: Number(r.version_number),
    } as VendorRateDto;
  }
  const r = result.rows[0];
  return {
    ...r,
    amount: toNumber(r.amount),
    version_number: Number(r.version_number),
  } as VendorRateDto;
}

export async function getVendorPayments(vendorId: string): Promise<VendorPaymentDto[]> {
  const result = await query(
    `SELECT * FROM vendor_payments WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [vendorId]
  );
  return result.rows.map((p) => ({
    ...p,
    amount: toNumber(p.amount),
  })) as VendorPaymentDto[];
}

export async function getVendorAvailability(vendorId: string) {
  const result = await query(
    `SELECT * FROM vendor_availability WHERE vendor_id = $1 ORDER BY available_from ASC`,
    [vendorId]
  );
  return result.rows;
}

export function computeVendorPerformance(
  rates: VendorRateDto[],
  payments: VendorPaymentDto[]
): VendorPerformance {
  const current = rates.find((r) => r.is_current);
  const outstanding = payments
    .filter((p) => p.status !== "PAID")
    .reduce((s, p) => s + p.amount, 0);

  const paidWithDue = payments.filter((p) => p.status === "PAID" && p.due_date && p.paid_date);
  const onTime =
    paidWithDue.length === 0
      ? 100
      : Math.round(
          (paidWithDue.filter((p) => p.paid_date! <= p.due_date!).length / paidWithDue.length) *
            10000
        ) / 100;

  const avg =
    payments.length === 0
      ? 0
      : Math.round((payments.reduce((s, p) => s + p.amount, 0) / payments.length) * 100) / 100;

  return {
    total_rates: rates.length,
    current_rate: current?.amount ?? null,
    total_payments: payments.length,
    paid_on_time_percent: onTime,
    outstanding_balance: Math.round(outstanding * 100) / 100,
    avg_payment_amount: avg,
  };
}

export async function getVendorById(id: string, orgId: string) {
  const result = await query(
    `SELECT * FROM vendors WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, orgId]
  );
  if (!result.rows[0]) return null;

  const rates = await getVendorRates(id);
  const payments = await getVendorPayments(id);
  const availability = await getVendorAvailability(id);
  const row = result.rows[0];

  return {
    vendor: {
      ...row,
      commission_rate: toNumber(row.commission_rate),
    },
    rates,
    payments,
    availability,
    performance: computeVendorPerformance(rates, payments),
    outstanding_balance: computeVendorPerformance(rates, payments).outstanding_balance,
  };
}

export async function createVendor(
  orgId: string,
  userId: string,
  data: {
    name: string;
    type: string;
    contact_email?: string;
    contact_phone?: string;
    payment_terms?: string;
    commission_rate?: number;
    notes?: string;
    initial_rate?: number;
    rate_type?: string;
    valid_from?: string;
    valid_to?: string;
  }
) {
  const result = await query(
    `INSERT INTO vendors (organization_id, name, type, contact_email, contact_phone,
      payment_terms, commission_rate, notes, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      orgId,
      data.name.trim(),
      normalizeVendorType(data.type),
      data.contact_email || null,
      data.contact_phone || null,
      normalizePaymentTerms(data.payment_terms || "NET_30"),
      data.commission_rate ?? 0,
      data.notes || null,
      userId,
    ]
  );
  const vendorId = result.rows[0].id;

  if (data.initial_rate != null) {
    await addVendorRate(vendorId, userId, {
      amount: data.initial_rate,
      rate_type: data.rate_type || "FLAT",
      valid_from: data.valid_from,
      valid_to: data.valid_to,
    });
  }

  return vendorId;
}

export async function addVendorRate(
  vendorId: string,
  userId: string,
  data: {
    amount: number;
    rate_type?: string;
    currency?: string;
    valid_from?: string | null;
    valid_to?: string | null;
  }
) {
  await query(`UPDATE vendor_rates SET is_current = false WHERE vendor_id = $1`, [vendorId]);
  const version = await query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 as v FROM vendor_rates WHERE vendor_id = $1`,
    [vendorId]
  );
  const result = await query(
    `INSERT INTO vendor_rates (vendor_id, rate_type, amount, currency, valid_from, valid_to,
      version_number, created_by, is_current)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id`,
    [
      vendorId,
      (data.rate_type || "FLAT").toUpperCase(),
      data.amount,
      data.currency || "SAR",
      data.valid_from || null,
      data.valid_to || null,
      version.rows[0].v,
      userId,
    ]
  );
  return result.rows[0].id;
}

export async function recordVendorPayment(
  orgId: string,
  vendorId: string,
  data: {
    invoice_number?: string;
    amount: number;
    currency?: string;
    due_date?: string;
    paid_date?: string;
    payment_method?: string;
    status?: string;
    notes?: string;
  }
) {
  let status = data.status?.toUpperCase() || "PENDING";
  if (data.paid_date) status = "PAID";

  const result = await query(
    `INSERT INTO vendor_payments (vendor_id, organization_id, invoice_number, amount, currency,
      due_date, paid_date, payment_method, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      vendorId,
      orgId,
      data.invoice_number || null,
      data.amount,
      data.currency || "SAR",
      data.due_date || null,
      data.paid_date || null,
      data.payment_method || null,
      status,
      data.notes || null,
    ]
  );
  return result.rows[0];
}

export async function addVendorAvailability(
  vendorId: string,
  data: { available_from: string; available_to: string; capacity?: number; notes?: string }
) {
  const result = await query(
    `INSERT INTO vendor_availability (vendor_id, available_from, available_to, capacity, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [vendorId, data.available_from, data.available_to, data.capacity ?? null, data.notes || null]
  );
  return result.rows[0];
}

export async function markVendorPaymentPaid(paymentId: string, vendorId: string, orgId: string) {
  const result = await query(
    `UPDATE vendor_payments SET status = 'PAID', paid_date = CURRENT_DATE, updated_at = NOW()
     WHERE id = $1 AND vendor_id = $2 AND organization_id = $3 RETURNING *`,
    [paymentId, vendorId, orgId]
  );
  return result.rows[0] || null;
}
