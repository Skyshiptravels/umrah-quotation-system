import { NextRequest } from "next/server";
import { query, toNumber } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { calculateVisaCost } from "@/lib/calculations/visa";
import { getExchangeRate } from "@/lib/auth";
import { debugQuotation } from "@/lib/api-debug";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const body = await request.json();
    debugQuotation(`POST /quotations/${params.id}/visa`, "received", {
      quotation_id: params.id,
      body,
    });

    const { visa_category_id, num_adults_children, num_infants } = body;

    if (!visa_category_id) {
      debugQuotation(`POST /quotations/${params.id}/visa`, "error", {
        reason: "missing visa_category_id",
      });
      return badRequest("visa_category_id is required");
    }

  const quotation = await query(
    `SELECT * FROM quotations WHERE id = $1`,
    [params.id]
  );
  if (!quotation.rows[0]) return notFound("Quotation not found");

  const q = quotation.rows[0];
  const category = await query(
    `SELECT * FROM visa_categories WHERE id = $1`,
    [visa_category_id]
  );
  if (!category.rows[0]) return badRequest("Visa category not found");

  const adultsChildren =
    num_adults_children ??
    q.adults + q.children_with_bed + q.children_without_bed;
  const infants = num_infants ?? q.infants;

  const visaResult = calculateVisaCost(
    {
      adult_child_rate_sar: toNumber(category.rows[0].adult_child_rate_sar),
      infant_rate_sar: toNumber(category.rows[0].infant_rate_sar),
      counts: {
        adults: adultsChildren,
        children_with_bed: 0,
        children_without_bed: 0,
        infants,
      },
    },
    toNumber(q.currency_rate_snapshot) || getExchangeRate()
  );

  const result = await query(
    `INSERT INTO quotation_visas (
      quotation_id, visa_category_id, num_adults_children, num_infants,
      total_cost_sar, total_cost_pkr
    ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, total_cost_sar, total_cost_pkr`,
    [
      params.id,
      visa_category_id,
      adultsChildren,
      infants,
      visaResult.total_cost_sar,
      visaResult.total_cost_pkr,
    ]
  );

  await logAudit(auth.user.user_id, "ADD_VISA", "quotation", params.id, body);

  debugQuotation(`POST /quotations/${params.id}/visa`, "inserted", {
    visa_id: result.rows[0].id,
    total_cost_sar: visaResult.total_cost_sar,
    total_cost_pkr: visaResult.total_cost_pkr,
  });

  return ok({
    visa_id: result.rows[0].id,
    total_cost_sar: visaResult.total_cost_sar,
    total_cost_pkr: visaResult.total_cost_pkr,
  }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugQuotation(`POST /quotations/${params.id}/visa`, "error", { message });
    console.error("Add visa error:", error);
    return serverError("Failed to add visa");
  }
}
