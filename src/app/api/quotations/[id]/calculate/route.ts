import { NextRequest } from "next/server";
import { recalculateQuotation } from "@/lib/services/quotation-service";
import { upsertStaffCommission } from "@/lib/services/commission-service";
import { debugQuotation } from "@/lib/api-debug";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
  serverError,
} from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    debugQuotation(`POST /quotations/${params.id}/calculate`, "received", {
      quotation_id: params.id,
    });
    const breakdown = await recalculateQuotation(params.id);
    await upsertStaffCommission(params.id);
    debugQuotation(`POST /quotations/${params.id}/calculate`, "inserted", {
      hotel_cost_sar: breakdown.hotel_cost_sar,
      transport_cost_sar: breakdown.transport_cost_sar,
      visa_cost_sar: breakdown.visa_cost_sar,
      total_cost_sar: breakdown.total_cost_sar,
    });
    return ok({ breakdown });
  } catch (error) {
    if (error instanceof Error && error.message === "Quotation not found") {
      return notFound("Quotation not found");
    }
    const message = error instanceof Error ? error.message : String(error);
    debugQuotation(`POST /quotations/${params.id}/calculate`, "error", { message });
    console.error("Calculate error:", error);
    return serverError();
  }
}
