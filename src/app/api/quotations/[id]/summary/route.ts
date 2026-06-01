import { NextRequest } from "next/server";
import { recalculateQuotation } from "@/lib/services/quotation-service";
import { query, toNumber } from "@/lib/db";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const quotation = await query(
    `SELECT * FROM quotations WHERE id = $1 AND deleted_at IS NULL`,
    [params.id]
  );
  if (!quotation.rows[0]) return notFound("Quotation not found");

  const breakdown = await recalculateQuotation(params.id);
  const q = quotation.rows[0];

  return ok({
    customer: {
      name: q.customer_name,
      email: q.customer_email,
    },
    passengers: {
      adults: q.adults,
      children_with_bed: q.children_with_bed,
      children_without_bed: q.children_without_bed,
      infants: q.infants,
    },
    status: q.status,
    breakdown,
    external_costs: {
      flights_cost_pkr: toNumber(q.flights_cost_pkr),
      transfers_cost_sar: toNumber(q.transfers_cost_sar),
    },
    grand_total: {
      sar: breakdown.total_cost_sar,
      pkr: breakdown.total_cost_pkr,
    },
  });
}
