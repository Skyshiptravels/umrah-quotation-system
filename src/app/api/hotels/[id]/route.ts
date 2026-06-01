import { NextRequest } from "next/server";
import { query, toNumber } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { validatePayload } from "@/lib/hotel-admin-validation";
import { hotelNameExistsInCity, saveHotelFull } from "@/lib/services/hotel-admin-service";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  notFound,
  badRequest,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const hotelResult = await query(
    `SELECT * FROM hotels WHERE id = $1 AND deleted_at IS NULL`,
    [params.id]
  );
  const hotel = hotelResult.rows[0];
  if (!hotel) return notFound("Hotel not found");

  const rooms = await query(
    `SELECT room_type, base_price_sar, max_occupancy FROM hotel_rooms
     WHERE hotel_id = $1 ORDER BY max_occupancy`,
    [params.id]
  );

  const seasons = await query(
    `SELECT * FROM hotel_seasons WHERE hotel_id = $1 ORDER BY start_date`,
    [params.id]
  );

  const commission = await query(
    `SELECT commission_rate_percent FROM hotel_commissions
     WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [params.id]
  );

  const today = new Date().toISOString().split("T")[0];
  const currentSeason = seasons.rows.find(
    (s) => s.start_date <= today && s.end_date >= today
  );

  return ok({
    hotel,
    room_types: rooms.rows,
    seasons: seasons.rows,
    current_season_multiplier: currentSeason
      ? toNumber(currentSeason.season_multiplier)
      : 1.0,
    commission_rate_percent: toNumber(
      commission.rows[0]?.commission_rate_percent ?? 0
    ),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_HOTELS);
  if (permErr) return permErr;

  try {
    const existing = await query(
      `SELECT id, organization_id FROM hotels WHERE id = $1 AND deleted_at IS NULL`,
      [params.id]
    );
    if (!existing.rows[0]) return notFound("Hotel not found");

    const body = await request.json();
    const validation = validatePayload(body);
    if (!validation.valid) return badRequest(validation.errors.join("; "));

    const orgId = existing.rows[0].organization_id;
    const exists = await hotelNameExistsInCity(body.name, body.city, orgId, params.id);
    if (exists) return badRequest("Error: Hotel name already exists in this city");

    await saveHotelFull(body, orgId, params.id);
    await logAudit(auth.user.user_id, "UPDATE", "hotel", params.id, body);

    return ok({ hotel_id: params.id });
  } catch (error) {
    console.error("Update hotel error:", error);
    return badRequest("Failed to update hotel");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_HOTELS);
  if (permErr) return permErr;

  const result = await query(
    `UPDATE hotels SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL RETURNING id, name`,
    [params.id]
  );

  if (!result.rows[0]) return notFound("Hotel not found");

  await logAudit(auth.user.user_id, "DELETE", "hotel", params.id, {
    name: result.rows[0].name,
  });
  return ok({ message: "Hotel deleted" });
}
