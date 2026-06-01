import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  replaceQuotationFull,
  saveQuotationDraft,
  softDeleteQuotation,
} from "@/lib/services/quotation-update-service";
import { QuotationSavePayload } from "@/lib/quotation-form-mapper";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
  badRequest,
  forbidden,
  serverError,
} from "@/lib/api-utils";

async function canAccessQuotation(
  userId: string,
  role: string,
  quotationId: string
): Promise<boolean> {
  if (["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER", "VIEWER"].includes(role)) {
    return true;
  }
  const result = await query(
    `SELECT staff_id FROM quotations WHERE id = $1`,
    [quotationId]
  );
  return result.rows[0]?.staff_id === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  if (!(await canAccessQuotation(auth.user.user_id, auth.user.role, params.id))) {
    return forbidden();
  }

  const quotation = await query(
    `SELECT * FROM quotations WHERE id = $1 AND deleted_at IS NULL`,
    [params.id]
  );
  if (!quotation.rows[0]) return notFound("Quotation not found");

  const hotels = await query(
    `SELECT qh.*, h.name as hotel_name, h.sharing_rate_per_bed FROM quotation_hotels qh
     JOIN hotels h ON h.id = qh.hotel_id WHERE qh.quotation_id = $1 ORDER BY qh.check_in_date`,
    [params.id]
  );
  const transport = await query(
    `SELECT qt.*, tr.name as route_name FROM quotation_transport qt
     JOIN transport_routes tr ON tr.id = qt.route_id WHERE qt.quotation_id = $1`,
    [params.id]
  );
  const visas = await query(
    `SELECT qv.*, vc.name as visa_name, vc.code as visa_code FROM quotation_visas qv
     JOIN visa_categories vc ON vc.id = qv.visa_category_id WHERE qv.quotation_id = $1`,
    [params.id]
  );

  const q = quotation.rows[0];
  return ok({
    quotation: q,
    hotels: hotels.rows,
    transport: transport.rows,
    visas: visas.rows,
    totals: {
      hotel_cost_sar: q.hotel_cost_sar,
      transport_cost_sar: q.transport_cost_sar,
      visa_cost_sar: q.visa_cost_sar,
      transfers_cost_sar: q.transfers_cost_sar,
      flights_cost_pkr: q.flights_cost_pkr,
      discount_amount_sar: q.discount_amount_sar,
      total_cost_sar: q.total_cost_sar,
      total_cost_pkr: q.total_cost_pkr,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  if (!(await canAccessQuotation(auth.user.user_id, auth.user.role, params.id))) {
    return forbidden();
  }

  try {
    const body = (await request.json()) as QuotationSavePayload &
      Record<string, unknown> & {
        customer_name?: string;
        customer_email?: string;
        status?: string;
      };

    if (body.draft) {
      await saveQuotationDraft(params.id, body, auth.user.user_id);
      await logAudit(auth.user.user_id, "DRAFT_SAVE", "quotation", params.id, {
        draft: true,
      });
      return ok({ quotation_id: params.id, status: "DRAFT", saved: true });
    }

    if (body.hotels && body.visa_category_id !== undefined) {
      if (!body.customer_name) {
        return badRequest("customer_name is required");
      }
      await replaceQuotationFull(params.id, body, auth.user.user_id);
      await logAudit(auth.user.user_id, "UPDATE", "quotation", params.id, {
        ...body,
      } as Record<string, unknown>);
      return ok({ quotation_id: params.id, message: "Quotation updated" });
    }

    const {
      customer_name,
      customer_email,
      status,
      adults,
      children_with_bed,
      children_without_bed,
      infants,
      transfers_cost_sar,
      flights_cost_pkr,
    } = body;

    const result = await query(
      `UPDATE quotations SET
        customer_name = COALESCE($1, customer_name),
        customer_email = COALESCE($2, customer_email),
        status = COALESCE($3, status),
        adults = COALESCE($4, adults),
        children_with_bed = COALESCE($5, children_with_bed),
        children_without_bed = COALESCE($6, children_without_bed),
        infants = COALESCE($7, infants),
        transfers_cost_sar = COALESCE($8, transfers_cost_sar),
        flights_cost_pkr = COALESCE($9, flights_cost_pkr),
        updated_at = NOW(),
        updated_by = $10
       WHERE id = $11 RETURNING *`,
      [
        customer_name,
        customer_email,
        status,
        adults,
        children_with_bed,
        children_without_bed,
        infants,
        transfers_cost_sar,
        flights_cost_pkr,
        auth.user.user_id,
        params.id,
      ]
    );

    if (!result.rows[0]) return notFound("Quotation not found");

    await logAudit(auth.user.user_id, "UPDATE", "quotation", params.id, body);
    return ok({ quotation: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    if (message.includes("Cannot modify")) return badRequest(message);
    console.error("PUT quotation error:", error);
    return serverError(message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  if (!(await canAccessQuotation(auth.user.user_id, auth.user.role, params.id))) {
    return forbidden();
  }

  const existing = await query(
    `SELECT status, staff_id FROM quotations WHERE id = $1 AND deleted_at IS NULL`,
    [params.id]
  );
  if (!existing.rows[0]) return notFound("Quotation not found");

  if (
    auth.user.role === "STAFF" &&
    existing.rows[0].staff_id !== auth.user.user_id
  ) {
    return forbidden();
  }

  if (existing.rows[0].status === "APPROVED") {
    return badRequest("Cannot delete approved quotation");
  }

  await softDeleteQuotation(params.id);
  await logAudit(auth.user.user_id, "DELETE", "quotation", params.id, {});
  return ok({ deleted: true });
}
