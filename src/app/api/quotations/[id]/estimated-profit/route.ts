import { NextRequest } from "next/server";
import {
  buildVendorCostBreakdown,
  calculateQuotationProfit,
} from "@/lib/services/quotation-workflow-service";
import { calculateProfitFromQuotation } from "@/lib/services/financial-service";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

function formatProfitResponse(
  profit: ReturnType<typeof calculateProfitFromQuotation>,
  vendorBreakdown?: { total: number } | null
) {
  return {
    revenue: profit.revenue,
    totalCost: profit.vendor_cost,
    vendor_cost: profit.vendor_cost,
    grossProfit: profit.gross_profit,
    gross_profit: profit.gross_profit,
    profitMargin: profit.profit_margin_percent,
    profit_margin_percent: profit.profit_margin_percent,
    commission: profit.staff_commission,
    staff_commission: profit.staff_commission,
    companyProfit: profit.company_profit,
    company_profit: profit.company_profit,
    vendor_breakdown: vendorBreakdown || null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const result = await calculateQuotationProfit(params.id, auth.user.organization_id);
    return ok(formatProfitResponse(result, result.vendor_breakdown));
  } catch (error) {
    if (error instanceof Error && error.message === "Quotation not found") {
      return notFound("Quotation not found");
    }
    return serverError("Failed to calculate profit", error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const body = await request.json();
    const revenue = Number(body.total_price_sar ?? body.revenue ?? 0);
    const totalPax = Number(body.total_pax ?? body.quantity ?? 1);
    const nights = Number(body.nights ?? 1);

    let vendorCost = 0;
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
      vendorCost = vendorBreakdown.total;
    } else {
      vendorCost =
        Number(body.hotel_cost || 0) +
        Number(body.transport_cost || 0) +
        Number(body.visa_cost || 0);
    }

    const marginPercent = Number(body.staff_margin_percent ?? 10);
    const profit = calculateProfitFromQuotation(
      revenue,
      body.hotel_cost != null ? Number(body.hotel_cost) : vendorBreakdown?.hotel?.total || 0,
      body.transport_cost != null
        ? Number(body.transport_cost)
        : vendorBreakdown?.transport?.total || 0,
      body.visa_cost != null ? Number(body.visa_cost) : vendorBreakdown?.visa?.total || 0,
      marginPercent
    );

    if (vendorCost > 0 && profit.vendor_cost === 0) {
      profit.vendor_cost = vendorCost;
      profit.gross_profit = Math.round((revenue - vendorCost) * 100) / 100;
      profit.profit_margin_percent =
        revenue > 0 ? Math.round((profit.gross_profit / revenue) * 10000) / 100 : 0;
      profit.staff_commission =
        Math.round(((profit.gross_profit * marginPercent) / 100) * 100) / 100;
      profit.company_profit =
        Math.round((profit.gross_profit - profit.staff_commission) * 100) / 100;
    }

    return ok(formatProfitResponse(profit, vendorBreakdown));
  } catch (error) {
    return serverError("Failed to estimate profit", error);
  }
}
