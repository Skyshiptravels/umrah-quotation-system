import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getExchangeRate } from "@/lib/auth";
import { debugQuotation } from "@/lib/api-debug";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  badRequest,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));
  const offset = (page - 1) * limit;
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const sort = searchParams.get("sort") || "date-desc";

  const isOwnOnly =
    auth.user.role === "STAFF" || auth.user.role === "AGENT";

  let whereClause = "q.organization_id = $1 AND q.deleted_at IS NULL";
  const params: unknown[] = [auth.user.organization_id];
  let paramIdx = 2;

  if (isOwnOnly) {
    whereClause += ` AND q.staff_id = $${paramIdx}`;
    params.push(auth.user.user_id);
    paramIdx++;
  }

  if (search) {
    whereClause += ` AND (q.customer_name ILIKE $${paramIdx} OR q.customer_email ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (status && status !== "all") {
    whereClause += ` AND q.status = $${paramIdx}`;
    params.push(status.toUpperCase());
    paramIdx++;
  }

  if (dateFrom) {
    whereClause += ` AND q.created_at >= $${paramIdx}`;
    params.push(dateFrom);
    paramIdx++;
  }

  if (dateTo) {
    whereClause += ` AND q.created_at <= $${paramIdx}::date + interval '1 day'`;
    params.push(dateTo);
    paramIdx++;
  }

  const orderBy =
    sort === "date-asc"
      ? "q.created_at ASC"
      : sort === "amount-desc"
        ? "q.total_cost_sar DESC"
        : sort === "amount-asc"
          ? "q.total_cost_sar ASC"
          : "q.created_at DESC";

  const countResult = await query(
    `SELECT COUNT(*) FROM quotations q WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;
  const result = await query(
    `SELECT q.id, q.customer_name, q.customer_email, q.status,
            q.total_cost_sar, q.total_cost_pkr, q.created_at, q.expiry_date,
            q.adults, q.children_with_bed, q.children_without_bed, q.infants,
            u.email as staff_email
     FROM quotations q
     LEFT JOIN users u ON u.id = q.staff_id
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return ok({
    data: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.CREATE_QUOTATION);
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_whatsapp,
      client_id,
      organization_id,
      adults = 0,
      children_with_bed = 0,
      children_without_bed = 0,
      infants = 0,
      transfers_cost_sar = 0,
      flights_cost_pkr = 0,
      air_ticket_adult_pkr = 0,
      air_ticket_child_pkr = 0,
      air_ticket_infant_pkr = 0,
      suggested_upgrades,
      upgrades_cost_sar = 0,
      draft,
      draft_form,
    } = body;

    debugQuotation("POST /quotations", "received", { body });

    if (!customer_name && !draft) {
      return badRequest("customer_name is required");
    }

    const orgId = organization_id || auth.user.organization_id;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 2);
    const expiryStr = expiryDate.toISOString().split("T")[0];

    const result = await query(
      `INSERT INTO quotations (
        organization_id, staff_id, customer_name, customer_email,
        customer_phone, customer_whatsapp, client_id, expiry_date, status,
        adults, children_with_bed, children_without_bed, infants,
        transfers_cost_sar, flights_cost_pkr,
        air_ticket_adult_pkr, air_ticket_child_pkr, air_ticket_infant_pkr,
        suggested_upgrades, upgrades_cost_sar, currency_rate_snapshot
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING id, status, total_cost_sar, total_cost_pkr`,
      [
        orgId,
        auth.user.user_id,
        customer_name || "Draft Quotation",
        customer_email || null,
        customer_phone || null,
        customer_whatsapp || null,
        client_id || null,
        expiryStr,
        adults,
        children_with_bed,
        children_without_bed,
        infants,
        transfers_cost_sar,
        flights_cost_pkr,
        air_ticket_adult_pkr,
        air_ticket_child_pkr,
        air_ticket_infant_pkr,
        suggested_upgrades ? JSON.stringify(suggested_upgrades) : null,
        upgrades_cost_sar,
        getExchangeRate(),
      ]
    );

    const quotation = result.rows[0];

    if (draft && draft_form) {
      const { saveQuotationDraft } = await import("@/lib/services/quotation-update-service");
      await saveQuotationDraft(
        quotation.id,
        { ...body, draft: true, draft_form },
        auth.user.user_id
      );
    }
    await logAudit(auth.user.user_id, "CREATE", "quotation", quotation.id, body);

    debugQuotation("POST /quotations", "inserted", {
      quotation_id: quotation.id,
      transfers_cost_sar,
      flights_cost_pkr,
    });

    return ok(
      {
        quotation_id: quotation.id,
        status: quotation.status,
        cost_summary: {
          total_cost_sar: 0,
          total_cost_pkr: 0,
        },
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugQuotation("POST /quotations", "error", { message, error });
    console.error("Create quotation error:", error);
    return serverError("Failed to create quotation");
  }
}
