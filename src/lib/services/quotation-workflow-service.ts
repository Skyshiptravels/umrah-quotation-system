import { query, toNumber } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  calculateProfitFromQuotation,
  ProfitBreakdown,
  recordFinancialTransaction,
} from "@/lib/services/financial-service";
import { recordPayment } from "@/lib/services/payment-service";
import { upsertStaffCommission } from "@/lib/services/commission-service";
import {
  getCurrentVendorRate,
  getVendorById,
  listVendors,
} from "@/lib/services/vendor-service";

export interface VendorLineItem {
  vendor_id: string;
  vendor_name: string;
  rate_type: string;
  rate: number;
  quantity: number;
  nights: number;
  total: number;
  currency: string;
}

export interface VendorCostBreakdown {
  hotel: VendorLineItem | null;
  transport: VendorLineItem | null;
  visa: VendorLineItem | null;
  total: number;
}

export function computeVendorLineCost(
  rateType: string,
  amount: number,
  quantity: number,
  nights = 1
): number {
  const t = rateType.toUpperCase();
  if (t === "PER_PAX" || t === "PER_BED") {
    return Math.round(amount * quantity * nights * 100) / 100;
  }
  if (t === "PER_ROOM") {
    return Math.round(amount * Math.max(1, Math.ceil(quantity / 4)) * nights * 100) / 100;
  }
  return Math.round(amount * 100) / 100;
}

export async function buildVendorCostBreakdown(
  orgId: string,
  selections: {
    hotel_vendor_id?: string | null;
    transport_vendor_id?: string | null;
    visa_vendor_id?: string | null;
  },
  quantity: number,
  nights = 1,
  referenceDate?: string | null
): Promise<VendorCostBreakdown> {
  const ref = referenceDate || new Date().toISOString().split("T")[0];
  const breakdown: VendorCostBreakdown = {
    hotel: null,
    transport: null,
    visa: null,
    total: 0,
  };

  async function lineFor(
    vendorId: string | null | undefined,
    key: "hotel" | "transport" | "visa"
  ) {
    if (!vendorId) return;
    const vendor = await getVendorById(vendorId, orgId);
    if (!vendor) return;
    const rate = await getCurrentVendorRate(vendorId, ref);
    if (!rate) return;

    const total = computeVendorLineCost(rate.rate_type, rate.amount, quantity, nights);
    breakdown[key] = {
      vendor_id: vendorId,
      vendor_name: String((vendor.vendor as Record<string, unknown>).name),
      rate_type: rate.rate_type,
      rate: rate.amount,
      quantity,
      nights,
      total,
      currency: rate.currency,
    };
    breakdown.total += total;
  }

  await lineFor(selections.hotel_vendor_id, "hotel");
  await lineFor(selections.transport_vendor_id, "transport");
  await lineFor(selections.visa_vendor_id, "visa");

  breakdown.total = Math.round(breakdown.total * 100) / 100;
  return breakdown;
}

export function parseVendorCostBreakdown(raw: unknown): VendorCostBreakdown | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const hotel = o.hotel as VendorLineItem | null | undefined;
  const transport = o.transport as VendorLineItem | null | undefined;
  const visa = o.visa as VendorLineItem | null | undefined;
  const total =
    toNumber(o.total as string | number) ||
    (hotel?.total || 0) + (transport?.total || 0) + (visa?.total || 0);

  return {
    hotel: hotel || null,
    transport: transport || null,
    visa: visa || null,
    total: Math.round(total * 100) / 100,
  };
}

export function extractVendorSelections(raw: unknown): {
  hotel_vendor_id: string | null;
  transport_vendor_id: string | null;
  visa_vendor_id: string | null;
} {
  const b = parseVendorCostBreakdown(raw);
  return {
    hotel_vendor_id: b?.hotel?.vendor_id || null,
    transport_vendor_id: b?.transport?.vendor_id || null,
    visa_vendor_id: b?.visa?.vendor_id || null,
  };
}

export async function getQuotationForWorkflow(quotationId: string, orgId: string) {
  const result = await query(
    `SELECT q.*, c.full_name as client_name, c.email as client_email
     FROM quotations q
     LEFT JOIN clients c ON c.id = q.client_id
     WHERE q.id = $1 AND q.organization_id = $2 AND q.deleted_at IS NULL`,
    [quotationId, orgId]
  );
  return result.rows[0] ?? null;
}

export async function calculateQuotationProfit(
  quotationId: string,
  orgId: string
): Promise<ProfitBreakdown & { vendor_breakdown: VendorCostBreakdown | null }> {
  const q = await getQuotationForWorkflow(quotationId, orgId);
  if (!q) throw new Error("Quotation not found");

  const revenue = toNumber(q.total_cost_sar);
  const vendorBreakdown = parseVendorCostBreakdown(q.vendor_cost_breakdown);

  const hotelCost = vendorBreakdown?.hotel?.total ?? toNumber(q.hotel_cost_sar);
  const transportCost = vendorBreakdown?.transport?.total ?? toNumber(q.transport_cost_sar);
  const visaCost = vendorBreakdown?.visa?.total ?? toNumber(q.visa_cost_sar);

  const staffRow = await query(
    `SELECT staff_margin_percent FROM users WHERE id = $1`,
    [q.staff_id]
  );
  const marginPercent = toNumber(staffRow.rows[0]?.staff_margin_percent) || 10;

  const profit = calculateProfitFromQuotation(
    revenue,
    hotelCost,
    transportCost,
    visaCost,
    marginPercent
  );

  return { ...profit, vendor_breakdown: vendorBreakdown };
}

export async function saveVendorCostBreakdown(
  quotationId: string,
  breakdown: VendorCostBreakdown
) {
  await query(
    `UPDATE quotations SET vendor_cost_breakdown = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(breakdown), quotationId]
  );
}

async function nextInvoiceNumber(orgId: string): Promise<string> {
  const result = await query(
    `SELECT COUNT(*)::int as cnt FROM invoices WHERE organization_id = $1`,
    [orgId]
  );
  const seq = Number(result.rows[0]?.cnt || 0) + 1;
  return `INV-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
}

export async function generateInvoiceFromQuotation(
  quotationId: string,
  orgId: string,
  userId: string
) {
  const existing = await query(
    `SELECT id FROM invoices WHERE quotation_id = $1 LIMIT 1`,
    [quotationId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const q = await getQuotationForWorkflow(quotationId, orgId);
  if (!q) throw new Error("Quotation not found");

  const breakdown = parseVendorCostBreakdown(q.vendor_cost_breakdown);
  const items = [
    breakdown?.hotel && {
      description: `Hotel — ${breakdown.hotel.vendor_name}`,
      rate: breakdown.hotel.rate,
      quantity: breakdown.hotel.quantity,
      amount: breakdown.hotel.total,
    },
    breakdown?.transport && {
      description: `Transport — ${breakdown.transport.vendor_name}`,
      rate: breakdown.transport.rate,
      quantity: breakdown.transport.quantity,
      amount: breakdown.transport.total,
    },
    breakdown?.visa && {
      description: `Visa — ${breakdown.visa.vendor_name}`,
      rate: breakdown.visa.rate,
      quantity: breakdown.visa.quantity,
      amount: breakdown.visa.total,
    },
    {
      description: `Umrah Package — ${q.customer_name}`,
      rate: toNumber(q.total_cost_sar),
      quantity: 1,
      amount: toNumber(q.total_cost_sar),
    },
  ].filter(Boolean);

  const due = new Date();
  due.setDate(due.getDate() + 14);
  const invoiceNumber = await nextInvoiceNumber(orgId);

  const result = await query(
    `INSERT INTO invoices (
      organization_id, quotation_id, client_id, invoice_number,
      total_amount_sar, issued_date, due_date, status, items, notes, created_by
    ) VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,'SENT',$7,$8,$9)
    RETURNING *`,
    [
      orgId,
      quotationId,
      q.client_id || null,
      invoiceNumber,
      toNumber(q.total_cost_sar),
      due.toISOString().split("T")[0],
      JSON.stringify(items),
      `Auto-generated from quotation ${quotationId}`,
      userId,
    ]
  );
  return result.rows[0];
}

export async function createApprovalPaymentRecord(quotationId: string, orgId: string) {
  const q = await getQuotationForWorkflow(quotationId, orgId);
  if (!q?.client_id) return null;

  const existingPayment = await query(
    `SELECT * FROM client_payments WHERE quotation_id = $1 AND organization_id = $2 LIMIT 1`,
    [quotationId, orgId]
  );
  if (existingPayment.rows[0]) return existingPayment.rows[0];

  const invoice = await query(
    `SELECT invoice_number FROM invoices WHERE quotation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [quotationId]
  );

  const due = new Date();
  due.setDate(due.getDate() + 14);

  return recordPayment(orgId, {
    client_id: q.client_id,
    quotation_id: quotationId,
    amount_due: toNumber(q.total_cost_sar),
    amount_paid: 0,
    payment_due_date: due.toISOString().split("T")[0],
    invoice_number: invoice.rows[0]?.invoice_number || undefined,
  });
}

export async function sendQuotationApprovalEmail(quotationId: string, orgId: string) {
  const q = await getQuotationForWorkflow(quotationId, orgId);
  if (!q) throw new Error("Quotation not found");

  const to = q.client_email || q.customer_email;
  if (!to) return { sent: false, reason: "No recipient email" };

  const invoice = await query(
    `SELECT invoice_number, total_amount_sar, due_date FROM invoices WHERE quotation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [quotationId]
  );
  const inv = invoice.rows[0];

  await sendEmail({
    to,
    subject: `Your Umrah Quotation Has Been Approved${inv ? ` — ${inv.invoice_number}` : ""}`,
    html: `
      <p>Dear ${q.customer_name || q.client_name},</p>
      <p>Your quotation has been approved.</p>
      <p><strong>Total:</strong> ${toNumber(q.total_cost_sar).toLocaleString()} SAR</p>
      ${inv ? `<p><strong>Invoice:</strong> ${inv.invoice_number}<br/><strong>Due:</strong> ${inv.due_date}</p>` : ""}
      <p>Thank you for choosing us.</p>
    `,
    text: `Your quotation has been approved. Total: ${toNumber(q.total_cost_sar)} SAR`,
  });

  if (inv) {
    await query(
      `UPDATE invoices SET sent_date = NOW(), status = 'SENT', updated_at = NOW()
       WHERE quotation_id = $1`,
      [quotationId]
    );
  }

  return { sent: true, to };
}

export async function executeApprovalWorkflow(
  quotationId: string,
  orgId: string,
  userId: string
) {
  const q = await getQuotationForWorkflow(quotationId, orgId);
  if (!q) throw new Error("Quotation not found");

  const profit = await calculateQuotationProfit(quotationId, orgId);
  const vendorItems = (q.vendor_cost_breakdown as Record<string, unknown>) || {};

  await recordFinancialTransaction(orgId, quotationId, profit, vendorItems, q.client_id);
  await upsertStaffCommission(quotationId);

  const invoice = await generateInvoiceFromQuotation(quotationId, orgId, userId);
  const payment = await createApprovalPaymentRecord(quotationId, orgId);
  const email = await sendQuotationApprovalEmail(quotationId, orgId);

  return { invoice, payment, email, profit };
}

export async function searchVendors(orgId: string, search?: string, type?: string) {
  return listVendors(orgId, { search, type, activeOnly: true });
}

export async function searchClients(orgId: string, search?: string) {
  const { listClients } = await import("@/lib/services/client-service");
  return listClients(orgId, { search, status: "ACTIVE" });
}

export async function getInvoiceByQuotationId(quotationId: string, orgId: string) {
  const result = await query(
    `SELECT i.*, q.customer_name, c.full_name as client_name, c.email as client_email
     FROM invoices i
     JOIN quotations q ON q.id = i.quotation_id
     LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.quotation_id = $1 AND q.organization_id = $2
     ORDER BY i.created_at DESC LIMIT 1`,
    [quotationId, orgId]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    total_amount_sar: toNumber(row.total_amount_sar),
    items: row.items || [],
  };
}
