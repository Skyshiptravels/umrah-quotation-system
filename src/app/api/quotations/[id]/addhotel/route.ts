import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { calculateRoomCost, calculateSharingStayCost } from "@/lib/calculations/hotel";
import { toNumber } from "@/lib/db";
import { debugQuotation } from "@/lib/api-debug";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";
import { HotelSeason, ViewModifier, MealPlan } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const body = await request.json();
    debugQuotation(`POST /quotations/${params.id}/addhotel`, "received", {
      quotation_id: params.id,
      body,
    });

    const {
    hotel_id,
    city,
    check_in_date,
    check_out_date,
    nights,
    view_modifier = "NONE",
    meal_plan = "RO",
    booking_mode = "PRIVATE",
    sharing_pax = 0,
    room_type_1,
    quantity_1 = 0,
    room_type_2,
    quantity_2 = 0,
  } = body;

  if (!hotel_id || !city || !check_in_date || !check_out_date || !nights) {
    debugQuotation(`POST /quotations/${params.id}/addhotel`, "error", {
      reason: "missing required fields",
      hotel_id,
      city,
    });
    return badRequest("hotel_id, city, dates, and nights are required");
  }

  const quotation = await query(
    `SELECT status FROM quotations WHERE id = $1`,
    [params.id]
  );
  if (!quotation.rows[0]) return notFound("Quotation not found");
  if (quotation.rows[0].status === "APPROVED") {
    return badRequest("Cannot modify approved quotation");
  }

  const hotel = await query(`SELECT * FROM hotels WHERE id = $1`, [hotel_id]);
  if (!hotel.rows[0]) {
    debugQuotation(`POST /quotations/${params.id}/addhotel`, "error", {
      reason: "hotel not found",
      hotel_id,
    });
    return badRequest("Hotel not found");
  }

  const seasons = await query<HotelSeason>(
    `SELECT * FROM hotel_seasons WHERE hotel_id = $1`,
    [hotel_id]
  );
  const commission = await query(
    `SELECT commission_rate_percent FROM hotel_commissions
     WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [hotel_id]
  );

  let subtotal = 0;

  if (booking_mode === "SHARING") {
    const rate = toNumber(hotel.rows[0].sharing_rate_per_bed);
    if (!rate || rate <= 0) {
      return badRequest("Hotel does not offer sharing or sharing rate is missing");
    }
    const pax = Math.max(1, Number(sharing_pax) || 0);
    subtotal = calculateSharingStayCost({
      rate_per_bed_sar: rate,
      pax_with_bed: pax,
      nights,
      view_modifier: view_modifier as ViewModifier,
      city: hotel.rows[0].city,
    });
  } else {
  const roomTypes = [
    { type: room_type_1, qty: quantity_1 },
    { type: room_type_2, qty: quantity_2 },
  ].filter((r) => r.type && r.qty > 0);

  for (const rt of roomTypes) {
    const room = await query(
      `SELECT base_price_sar FROM hotel_rooms WHERE hotel_id = $1 AND room_type = $2`,
      [hotel_id, rt.type]
    );
    const result = calculateRoomCost({
      room_type: rt.type,
      base_price_sar: toNumber(room.rows[0]?.base_price_sar),
      quantity: rt.qty,
      nights,
      view_modifier: view_modifier as ViewModifier,
      meal_plan: meal_plan as MealPlan,
      meal_premium_sar: toNumber(hotel.rows[0].meal_plan_bb_premium_sar),
      city: hotel.rows[0].city,
      check_in_date,
      check_out_date,
      seasons: seasons.rows.map((s) => ({
        ...s,
        season_multiplier: toNumber(s.season_multiplier),
      })),
      commission_rate_percent: toNumber(commission.rows[0]?.commission_rate_percent),
    });
    subtotal += result.net_cost_sar;
  }
  }

  const result = await query(
    `INSERT INTO quotation_hotels (
      quotation_id, hotel_id, city, check_in_date, check_out_date, nights,
      view_modifier, meal_plan, booking_mode, sharing_pax,
      room_type_1, quantity_1, room_type_2, quantity_2, subtotal_sar
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      params.id,
      hotel_id,
      city,
      check_in_date,
      check_out_date,
      nights,
      view_modifier,
      meal_plan,
      booking_mode,
      booking_mode === "SHARING" ? Math.max(1, Number(sharing_pax) || 0) : 0,
      booking_mode === "SHARING" ? "Sharing" : room_type_1 || null,
      booking_mode === "SHARING" ? 1 : quantity_1,
      booking_mode === "SHARING" ? null : room_type_2 || null,
      booking_mode === "SHARING" ? 0 : quantity_2,
      subtotal,
    ]
  );

  debugQuotation(`POST /quotations/${params.id}/addhotel`, "query", {
    sql: "INSERT INTO quotation_hotels",
    quotation_id: params.id,
    hotel_id,
    subtotal_sar: subtotal,
    row_count: result.rowCount,
  });

  await logAudit(auth.user.user_id, "ADD_HOTEL", "quotation", params.id, body);

  debugQuotation(`POST /quotations/${params.id}/addhotel`, "inserted", {
    line_id: result.rows[0].id,
    subtotal_sar: subtotal,
    city,
  });

  return ok({ hotel_line: result.rows[0], subtotal_sar: subtotal }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugQuotation(`POST /quotations/${params.id}/addhotel`, "error", { message });
    console.error("Add hotel error:", error);
    return serverError("Failed to add hotel");
  }
}
