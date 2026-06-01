import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { validatePayload } from "@/lib/hotel-admin-validation";
import { hotelNameExistsInCity, saveHotelFull } from "@/lib/services/hotel-admin-service";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  badRequest,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));
  const offset = (page - 1) * limit;
  const city = searchParams.get("city");
  const search = searchParams.get("search")?.trim().toLowerCase();

  const params: unknown[] = [auth.user.organization_id];
  let where = "h.organization_id = $1 AND h.deleted_at IS NULL";

  if (city) {
    params.push(city);
    where += ` AND h.city = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    where += ` AND (
      LOWER(h.name) LIKE $${idx}
      OR LOWER(COALESCE(h.category, '')) LIKE $${idx}
      OR LOWER(COALESCE(h.address, '')) LIKE $${idx}
      OR LOWER(COALESCE(h.distance_label, '')) LIKE $${idx}
      OR CAST(h.distance_m AS TEXT) LIKE $${idx}
    )`;
  }

  const countResult = await query(`SELECT COUNT(*) FROM hotels h WHERE ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const result = await query(
    `SELECT h.id as hotel_id, h.name, h.city, h.address,
            h.distance_m, h.distance_label, h.markaziya_status, h.category,
            h.amenities, h.staff_notes, h.pricing_model,
            h.offers_sharing, h.offers_private, h.sharing_rate_per_bed,
            (SELECT MIN(hs.start_date) FROM hotel_seasons hs WHERE hs.hotel_id = h.id) as season_start,
            (SELECT MAX(hs.end_date) FROM hotel_seasons hs WHERE hs.hotel_id = h.id) as season_end,
            (SELECT COUNT(*) FROM hotel_rooms hr WHERE hr.hotel_id = h.id) as total_rooms
     FROM hotels h
     WHERE ${where}
     ORDER BY h.city,
       CASE WHEN h.city IN ('Madinah', 'Makkah') THEN h.distance_m END ASC NULLS LAST,
       h.name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return ok({
    data: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_HOTELS);
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const validation = validatePayload(body);
    if (!validation.valid) return badRequest(validation.errors.join("; "));

    const orgId = body.organization_id || auth.user.organization_id;
    const exists = await hotelNameExistsInCity(body.name, body.city, orgId);
    if (exists) return badRequest("Error: Hotel name already exists in this city");

    const hotelId = await saveHotelFull(body, orgId);
    await logAudit(auth.user.user_id, "CREATE", "hotel", hotelId, body);

    return ok({ hotel_id: hotelId }, 201);
  } catch (error) {
    console.error("Create hotel error:", error);
    return badRequest("Failed to create hotel");
  }
}
