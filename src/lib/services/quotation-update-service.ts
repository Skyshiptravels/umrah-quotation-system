import { PoolClient } from "pg";
import { query, toNumber, withTransaction } from "@/lib/db";
import { calculateRoomCost, calculateSharingStayCost } from "@/lib/calculations/hotel";
import { getTransportPassengerCount, validateVehicleCapacity } from "@/lib/calculations/transport";
import { calculateVisaCost } from "@/lib/calculations/visa";
import { recalculateQuotation } from "@/lib/services/quotation-service";
import { logVisaUsage } from "@/lib/services/visa-admin-service";
import { resolveVisaRatesForQuotation } from "@/lib/visa-pricing";
import { QuotationSavePayload } from "@/lib/quotation-form-mapper";
import { HotelSeason, MealPlan, ViewModifier } from "@/types";

async function insertHotelLine(
  client: PoolClient,
  quotationId: string,
  line: QuotationSavePayload["hotels"][0],
  passengerCounts: { adults: number; children_with_bed: number; children_without_bed: number; infants: number }
) {
  const hotel = await client.query(`SELECT * FROM hotels WHERE id = $1`, [line.hotel_id]);
  if (!hotel.rows[0]) throw new Error(`Hotel not found: ${line.hotel_id}`);

  const seasons = await client.query<HotelSeason>(
    `SELECT * FROM hotel_seasons WHERE hotel_id = $1`,
    [line.hotel_id]
  );
  const commission = await client.query(
    `SELECT commission_rate_percent FROM hotel_commissions
     WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [line.hotel_id]
  );

  let subtotal = 0;

  if (line.booking_mode === "SHARING") {
    const rate = toNumber(hotel.rows[0].sharing_rate_per_bed);
    if (!rate || rate <= 0) throw new Error("Hotel sharing rate missing");
    const pax = Math.max(1, line.sharing_pax || passengerCounts.adults + passengerCounts.children_with_bed);
    subtotal = calculateSharingStayCost({
      rate_per_bed_sar: rate,
      pax_with_bed: pax,
      nights: line.nights,
      view_modifier: line.view_modifier as ViewModifier,
      city: hotel.rows[0].city,
    });
    await client.query(
      `INSERT INTO quotation_hotels (
        quotation_id, hotel_id, city, check_in_date, check_out_date, nights,
        view_modifier, meal_plan, booking_mode, sharing_pax,
        room_type_1, quantity_1, room_type_2, quantity_2, subtotal_sar
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        quotationId,
        line.hotel_id,
        line.city,
        line.check_in_date,
        line.check_out_date,
        line.nights,
        line.view_modifier,
        line.meal_plan,
        "SHARING",
        pax,
        "Sharing",
        1,
        null,
        0,
        subtotal,
      ]
    );
    return;
  }

  const roomTypes = [
    { type: line.room_type_1, qty: line.quantity_1 || 0 },
    { type: line.room_type_2, qty: line.quantity_2 || 0 },
  ].filter((r) => r.type && r.qty > 0);

  for (const rt of roomTypes) {
    const room = await client.query(
      `SELECT base_price_sar FROM hotel_rooms WHERE hotel_id = $1 AND room_type = $2`,
      [line.hotel_id, rt.type]
    );
    const result = calculateRoomCost({
      room_type: rt.type!,
      base_price_sar: toNumber(room.rows[0]?.base_price_sar),
      quantity: rt.qty!,
      nights: line.nights,
      view_modifier: line.view_modifier as ViewModifier,
      meal_plan: line.meal_plan as MealPlan,
      meal_premium_sar: toNumber(hotel.rows[0].meal_plan_bb_premium_sar),
      city: hotel.rows[0].city,
      check_in_date: line.check_in_date,
      check_out_date: line.check_out_date,
      seasons: seasons.rows.map((s) => ({
        ...s,
        season_multiplier: toNumber(s.season_multiplier),
      })),
      commission_rate_percent: toNumber(commission.rows[0]?.commission_rate_percent),
    });
    subtotal += result.net_cost_sar;
  }

  await client.query(
    `INSERT INTO quotation_hotels (
      quotation_id, hotel_id, city, check_in_date, check_out_date, nights,
      view_modifier, meal_plan, booking_mode, sharing_pax,
      room_type_1, quantity_1, room_type_2, quantity_2, subtotal_sar
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      quotationId,
      line.hotel_id,
      line.city,
      line.check_in_date,
      line.check_out_date,
      line.nights,
      line.view_modifier,
      line.meal_plan,
      "PRIVATE",
      0,
      line.room_type_1 || null,
      line.quantity_1 || 0,
      line.room_type_2 || null,
      line.quantity_2 || 0,
      subtotal,
    ]
  );
}

async function insertTransportLine(
  client: PoolClient,
  quotationId: string,
  routeId: string,
  vehicleType: string,
  passengerCounts: { adults: number; children_with_bed: number; children_without_bed: number; infants: number }
) {
  const transportPax = getTransportPassengerCount(passengerCounts);

  const rateResult = await client.query(
    `SELECT tr.price_sar, tr.is_sharing, v.capacity_pax
     FROM transport_rates tr
     JOIN vehicles v ON v.vehicle_type = tr.vehicle_type
     WHERE tr.route_id = $1 AND tr.vehicle_type = $2`,
    [routeId, vehicleType]
  );
  if (!rateResult.rows[0]) throw new Error("Transport rate not found");

  const rate = rateResult.rows[0];
  const isSharing = rate.is_sharing;

  if (!validateVehicleCapacity(transportPax, rate.capacity_pax, isSharing)) {
    throw new Error("Passenger count exceeds vehicle capacity");
  }

  const totalCost = isSharing
    ? toNumber(rate.price_sar) * transportPax
    : toNumber(rate.price_sar);

  await client.query(
    `INSERT INTO quotation_transport (
      quotation_id, route_id, vehicle_type, quantity_pax, is_sharing,
      seat_rate_sar, total_cost_sar
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      quotationId,
      routeId,
      vehicleType,
      transportPax,
      isSharing,
      isSharing ? toNumber(rate.price_sar) : null,
      totalCost,
    ]
  );
}

async function insertVisaLine(
  client: PoolClient,
  quotationId: string,
  visaCategoryId: string,
  passengerCounts: { adults: number; children_with_bed: number; children_without_bed: number; infants: number },
  exchangeRate: number,
  referenceDate?: string | null
) {
  const visa = await client.query(
    `SELECT * FROM visa_categories WHERE id = $1 AND is_active = true`,
    [visaCategoryId]
  );
  if (!visa.rows[0]) throw new Error("Visa category not found or inactive");

  const rates = resolveVisaRatesForQuotation(visa.rows[0], referenceDate);
  const visaResult = calculateVisaCost(
    {
      adult_child_rate_sar: rates.adult_child_rate_sar,
      infant_rate_sar: rates.infant_rate_sar,
      counts: passengerCounts,
    },
    exchangeRate
  );

  await client.query(
    `INSERT INTO quotation_visas (
      quotation_id, visa_category_id, num_adults_children, num_infants,
      total_cost_sar, total_cost_pkr
    ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      quotationId,
      visaCategoryId,
      passengerCounts.adults +
        passengerCounts.children_with_bed +
        passengerCounts.children_without_bed,
      passengerCounts.infants,
      visaResult.total_cost_sar,
      visaResult.total_cost_pkr,
    ]
  );

  await logVisaUsage(visaCategoryId, quotationId, rates.season);
}

export async function saveQuotationDraft(
  quotationId: string,
  payload: QuotationSavePayload,
  userId: string
): Promise<void> {
  await query(
    `UPDATE quotations SET
      customer_name = COALESCE($1, customer_name),
      customer_email = $2,
      customer_phone = $3,
      customer_whatsapp = $4,
      client_id = $5,
      adults = $6,
      children_with_bed = $7,
      children_without_bed = $8,
      infants = $9,
      air_ticket_adult_pkr = $10,
      air_ticket_child_pkr = $11,
      air_ticket_infant_pkr = $12,
      flights_cost_pkr = $13,
      suggested_upgrades = $14,
      upgrades_cost_sar = $15,
      draft_form_json = $16,
      vendor_cost_breakdown = COALESCE($17, vendor_cost_breakdown),
      status = 'DRAFT',
      updated_at = NOW(),
      updated_by = $18
     WHERE id = $19`,
    [
      payload.customer_name || "Draft",
      payload.customer_email || null,
      payload.customer_phone || null,
      payload.customer_whatsapp || null,
      payload.client_id || null,
      payload.adults,
      payload.children_with_bed,
      payload.children_without_bed,
      payload.infants,
      payload.air_ticket_adult_pkr,
      payload.air_ticket_child_pkr,
      payload.air_ticket_infant_pkr,
      payload.flights_cost_pkr,
      JSON.stringify(payload.suggested_upgrades),
      payload.upgrades_cost_sar,
      payload.draft_form ? JSON.stringify(payload.draft_form) : null,
      payload.vendor_cost_breakdown ? JSON.stringify(payload.vendor_cost_breakdown) : null,
      userId,
      quotationId,
    ]
  );
}

export async function replaceQuotationFull(
  quotationId: string,
  payload: QuotationSavePayload,
  userId: string
): Promise<void> {
  const existing = await query(
    `SELECT status, currency_rate_snapshot FROM quotations WHERE id = $1 AND deleted_at IS NULL`,
    [quotationId]
  );
  if (!existing.rows[0]) throw new Error("Quotation not found");
  if (!["DRAFT", "PENDING"].includes(existing.rows[0].status)) {
    throw new Error("Cannot modify quotation in current status");
  }

  const exchangeRate = toNumber(existing.rows[0].currency_rate_snapshot) || 74.5;
  const passengerCounts = {
    adults: payload.adults,
    children_with_bed: payload.children_with_bed,
    children_without_bed: payload.children_without_bed,
    infants: payload.infants,
  };

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE quotations SET
        customer_name = $1,
        customer_email = $2,
        customer_phone = $3,
        customer_whatsapp = $4,
        client_id = $5,
        adults = $6,
        children_with_bed = $7,
        children_without_bed = $8,
        infants = $9,
        transfers_cost_sar = $10,
        flights_cost_pkr = $11,
        air_ticket_adult_pkr = $12,
        air_ticket_child_pkr = $13,
        air_ticket_infant_pkr = $14,
        suggested_upgrades = $15,
        upgrades_cost_sar = $16,
        vendor_cost_breakdown = COALESCE($17, vendor_cost_breakdown),
        draft_form_json = NULL,
        updated_at = NOW(),
        updated_by = $18
       WHERE id = $19`,
      [
        payload.customer_name,
        payload.customer_email,
        payload.customer_phone,
        payload.customer_whatsapp,
        payload.client_id || null,
        payload.adults,
        payload.children_with_bed,
        payload.children_without_bed,
        payload.infants,
        payload.transfers_cost_sar,
        payload.flights_cost_pkr,
        payload.air_ticket_adult_pkr,
        payload.air_ticket_child_pkr,
        payload.air_ticket_infant_pkr,
        JSON.stringify(payload.suggested_upgrades),
        payload.upgrades_cost_sar,
        payload.vendor_cost_breakdown ? JSON.stringify(payload.vendor_cost_breakdown) : null,
        userId,
        quotationId,
      ]
    );

    await client.query(`DELETE FROM quotation_hotels WHERE quotation_id = $1`, [quotationId]);
    await client.query(`DELETE FROM quotation_transport WHERE quotation_id = $1`, [quotationId]);
    await client.query(`DELETE FROM quotation_visas WHERE quotation_id = $1`, [quotationId]);

    for (const h of payload.hotels) {
      await insertHotelLine(client, quotationId, h, passengerCounts);
    }

    const referenceDate =
      payload.hotels
        .map((h) => h.check_in_date)
        .filter(Boolean)
        .sort()[0] || null;

    for (const t of payload.transport) {
      await insertTransportLine(client, quotationId, t.route_id, t.vehicle_type, passengerCounts);
    }

    if (payload.visa_category_id) {
      await insertVisaLine(
        client,
        quotationId,
        payload.visa_category_id,
        passengerCounts,
        exchangeRate,
        referenceDate
      );
    }
  });

  await recalculateQuotation(quotationId);
}

export async function softDeleteQuotation(quotationId: string): Promise<void> {
  await query(
    `UPDATE quotations SET deleted_at = NOW(), status = 'DRAFT', updated_at = NOW() WHERE id = $1`,
    [quotationId]
  );
}
