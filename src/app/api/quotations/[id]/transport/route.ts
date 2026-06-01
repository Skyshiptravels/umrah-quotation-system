import { NextRequest } from "next/server";
import { query, toNumber } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getTransportPassengerCount } from "@/lib/calculations/transport";
import { validateVehicleCapacity } from "@/lib/calculations/transport";
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
    debugQuotation(`POST /quotations/${params.id}/transport`, "received", {
      quotation_id: params.id,
      body,
    });

    const { route_id, vehicle_type, passenger_count } = body;

    if (!route_id || !vehicle_type) {
      debugQuotation(`POST /quotations/${params.id}/transport`, "error", {
        reason: "missing route_id or vehicle_type",
      });
      return badRequest("route_id and vehicle_type are required");
    }

  const quotation = await query(
    `SELECT * FROM quotations WHERE id = $1`,
    [params.id]
  );
  if (!quotation.rows[0]) return notFound("Quotation not found");

  const q = quotation.rows[0];
  const transportPax =
    passenger_count ??
    getTransportPassengerCount({
      adults: q.adults,
      children_with_bed: q.children_with_bed,
      children_without_bed: q.children_without_bed,
      infants: q.infants,
    });

  const rateResult = await query(
    `SELECT tr.price_sar, tr.is_sharing, v.capacity_pax
     FROM transport_rates tr
     JOIN vehicles v ON v.vehicle_type = tr.vehicle_type
     WHERE tr.route_id = $1 AND tr.vehicle_type = $2`,
    [route_id, vehicle_type]
  );
  if (!rateResult.rows[0]) {
    debugQuotation(`POST /quotations/${params.id}/transport`, "error", {
      reason: "vehicle/rate not found",
      route_id,
      vehicle_type,
    });
    return badRequest("Vehicle/rate not found");
  }

  const rate = rateResult.rows[0];
  const isSharing = rate.is_sharing;

  if (
    !validateVehicleCapacity(
      transportPax,
      rate.capacity_pax,
      isSharing
    )
  ) {
    return badRequest(
      `Passenger count (${transportPax}) exceeds vehicle capacity (${rate.capacity_pax})`
    );
  }

  let totalCost: number;
  if (isSharing) {
    totalCost = toNumber(rate.price_sar) * transportPax;
  } else {
    totalCost = toNumber(rate.price_sar);
  }

  const result = await query(
    `INSERT INTO quotation_transport (
      quotation_id, route_id, vehicle_type, quantity_pax, is_sharing,
      seat_rate_sar, total_cost_sar
    ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, total_cost_sar`,
    [
      params.id,
      route_id,
      vehicle_type,
      transportPax,
      isSharing,
      isSharing ? toNumber(rate.price_sar) : null,
      totalCost,
    ]
  );

  await logAudit(auth.user.user_id, "ADD_TRANSPORT", "quotation", params.id, body);

  debugQuotation(`POST /quotations/${params.id}/transport`, "inserted", {
    transport_id: result.rows[0].id,
    total_cost_sar: toNumber(result.rows[0].total_cost_sar),
  });

  return ok({
    transport_id: result.rows[0].id,
    total_cost_sar: toNumber(result.rows[0].total_cost_sar),
  }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugQuotation(`POST /quotations/${params.id}/transport`, "error", { message });
    console.error("Add transport error:", error);
    return serverError("Failed to add transport");
  }
}
