import { NextRequest } from "next/server";
import {
  getQuotationForWorkflow,
  parseVendorCostBreakdown,
} from "@/lib/services/quotation-workflow-service";
import { toNumber } from "@/lib/db";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
  serverError,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const q = await getQuotationForWorkflow(params.id, auth.user.organization_id);
    if (!q) return notFound("Quotation not found");

    const parsed = parseVendorCostBreakdown(q.vendor_cost_breakdown);
    const breakdown = parsed || {
      hotel: null,
      transport: null,
      visa: null,
      total: 0,
    };

    return ok({
      breakdown,
      selling: {
        hotel_cost_sar: toNumber(q.hotel_cost_sar),
        transport_cost_sar: toNumber(q.transport_cost_sar),
        visa_cost_sar: toNumber(q.visa_cost_sar),
        total_cost_sar: toNumber(q.total_cost_sar),
      },
      client_id: q.client_id,
    });
  } catch (error) {
    return serverError("Failed to load cost breakdown", error);
  }
}
