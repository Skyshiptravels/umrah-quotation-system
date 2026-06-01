import { NextRequest } from "next/server";
import {
  buildVendorCostBreakdown,
} from "@/lib/services/quotation-workflow-service";
import { calculateProfitFromQuotation } from "@/lib/services/financial-service";
import { requireAuth, isAuthContext, ok, badRequest, serverError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const body = await request.json();
    const revenue = Number(body.total_price_sar ?? body.revenue ?? 0);
    if (!revenue) return badRequest("total_price_sar or revenue is required");

    const totalPax = Number(body.total_pax ?? body.quantity ?? 1);
    const nights = Number(body.nights ?? 1);
    const marginPercent = Number(body.staff_margin_percent ?? 10);

    let vendorBreakdown = null;
    if (body.hotel_vendor_id || body.transport_vendor_id || body.visa_vendor_id) {
      vendorBreakdown = await buildVendorCostBreakdown(
        auth.user.organization_id,
        {
          hotel_vendor_id: body.hotel_vendor_id,
          transport_vendor_id: body.transport_vendor_id,
          visa_vendor_id: body.visa_vendor_id,
        },
        totalPax,
        nights,
        body.reference_date
      );
    }

    const hotelCost =
      body.hotel_cost != null
        ? Number(body.hotel_cost)
        : vendorBreakdown?.hotel?.total || 0;
    const transportCost =
      body.transport_cost != null
        ? Number(body.transport_cost)
        : vendorBreakdown?.transport?.total || 0;
    const visaCost =
      body.visa_cost != null ? Number(body.visa_cost) : vendorBreakdown?.visa?.total || 0;

    const profit = calculateProfitFromQuotation(
      revenue,
      hotelCost,
      transportCost,
      visaCost,
      marginPercent
    );

    return ok({
      revenue: profit.revenue,
      totalCost: profit.vendor_cost,
      grossProfit: profit.gross_profit,
      profitMargin: profit.profit_margin_percent,
      commission: profit.staff_commission,
      companyProfit: profit.company_profit,
      vendor_breakdown: vendorBreakdown,
    });
  } catch (error) {
    return serverError("Failed to estimate profit", error);
  }
}
