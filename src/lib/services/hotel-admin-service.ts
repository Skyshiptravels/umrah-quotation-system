import { query } from "@/lib/db";
import { parseDistanceMeters } from "@/lib/hotel-rate-calculations";
import { HotelAdminPayload } from "@/types/hotel-admin";

const OCCUPANCY: Record<string, number> = {
  Single: 1,
  Double: 2,
  Triple: 3,
  Quad: 4,
  Quint: 5,
};

function pricingModelFlag(payload: HotelAdminPayload): string {
  if (payload.offers_sharing && payload.offers_private) return "BOTH";
  if (payload.offers_sharing) return "SHARING";
  return "ROOM";
}

export async function saveHotelFull(
  payload: HotelAdminPayload,
  organizationId: string,
  hotelId?: string
): Promise<string> {
  const distanceM = parseDistanceMeters(payload.distance_label);
  const enabledTypes = payload.room_rates.map((r) => r.room_type);
  const pricingModel = pricingModelFlag(payload);

  let id = hotelId;

  if (id) {
    await query(
      `UPDATE hotels SET
        name = $1, city = $2, category = $3, address = $4,
        distance_label = $5, distance_m = $6, pricing_model = $7,
        markaziya_status = $8, amenities = $9, staff_notes = $10,
        enabled_room_types = $11, sharing_rate_per_bed = $12,
        offers_sharing = $13, offers_private = $14, updated_at = NOW()
       WHERE id = $15 AND deleted_at IS NULL`,
      [
        payload.name,
        payload.city,
        payload.category,
        payload.location,
        payload.distance_label,
        distanceM,
        pricingModel,
        payload.markaziya_status || null,
        payload.amenities || [],
        payload.staff_notes || null,
        enabledTypes,
        payload.sharing_rate_per_bed ?? null,
        payload.offers_sharing,
        payload.offers_private,
        id,
      ]
    );
  } else {
    const result = await query(
      `INSERT INTO hotels (
        organization_id, name, city, category, address, distance_label, distance_m,
        pricing_model, markaziya_status, amenities, staff_notes, enabled_room_types,
        sharing_rate_per_bed, offers_sharing, offers_private, meal_plan_bb_premium_sar
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,50)
      RETURNING id`,
      [
        organizationId,
        payload.name,
        payload.city,
        payload.category,
        payload.location,
        payload.distance_label,
        distanceM,
        pricingModel,
        payload.markaziya_status || null,
        payload.amenities || [],
        payload.staff_notes || null,
        enabledTypes,
        payload.sharing_rate_per_bed ?? null,
        payload.offers_sharing,
        payload.offers_private,
      ]
    );
    id = result.rows[0].id;
    await query(
      `INSERT INTO hotel_commissions (hotel_id, commission_rate_percent) VALUES ($1, 0)`,
      [id]
    );
  }

  await query(`DELETE FROM hotel_rooms WHERE hotel_id = $1`, [id]);
  for (const room of payload.room_rates) {
    await query(
      `INSERT INTO hotel_rooms (hotel_id, room_type, base_price_sar, max_occupancy)
       VALUES ($1, $2, $3, $4)`,
      [id, room.room_type, room.full_room_rate_sar, OCCUPANCY[room.room_type] || 1]
    );
  }

  await query(`DELETE FROM hotel_seasons WHERE hotel_id = $1`, [id]);
  await query(
    `INSERT INTO hotel_seasons (hotel_id, start_date, end_date, season_multiplier)
     VALUES ($1, $2, $3, 1.0)`,
    [id, payload.date_start, payload.date_end]
  );

  return id!;
}

export async function hotelNameExistsInCity(
  name: string,
  city: string,
  orgId: string,
  excludeId?: string
): Promise<boolean> {
  const params: unknown[] = [name, city, orgId];
  let sql = `SELECT id FROM hotels WHERE LOWER(name) = LOWER($1) AND city = $2
    AND organization_id = $3 AND deleted_at IS NULL`;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND id <> $4`;
  }
  const result = await query(sql, params);
  return result.rows.length > 0;
}
