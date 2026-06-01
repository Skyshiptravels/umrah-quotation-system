import { query, toNumber, withTransaction } from "@/lib/db";
import {
  calculateHotelLineTotal,
  calculateRoomCost,
  calculateSharingStayCost,
} from "@/lib/calculations/hotel";
import { calculateTotalTransportCost, getTransportPassengerCount } from "@/lib/calculations/transport";
import { calculateVisaCost } from "@/lib/calculations/visa";
import { calculateQuotationTotals } from "@/lib/calculations/quotation";
import { logVisaUsage } from "@/lib/services/visa-admin-service";
import { resolveVisaRatesForQuotation, VisaRateSource } from "@/lib/visa-pricing";
import { getExchangeRate } from "@/lib/auth";
import {
  HotelPricingInput,
  HotelSeason,
  PassengerCounts,
  QuotationCostBreakdown,
  ViewModifier,
  MealPlan,
} from "@/types";

interface QuotationRow {
  id: string;
  organization_id: string;
  staff_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_whatsapp: string | null;
  expiry_date: string | null;
  status: string;
  adults: number;
  children_with_bed: number;
  children_without_bed: number;
  infants: number;
  total_cost_sar: string;
  total_cost_pkr: string;
  hotel_cost_sar: string;
  transport_cost_sar: string;
  visa_cost_sar: string;
  transfers_cost_sar: string;
  upgrades_cost_sar: string;
  flights_cost_pkr: string;
  air_ticket_adult_pkr: string | null;
  air_ticket_child_pkr: string | null;
  air_ticket_infant_pkr: string | null;
  suggested_upgrades: Record<string, unknown> | null;
  discount_amount_sar: string;
  currency_rate_snapshot: string;
  price_snapshot_json: Record<string, unknown> | null;
}

export async function getQuotationById(id: string): Promise<QuotationRow | null> {
  const result = await query<QuotationRow>(
    `SELECT * FROM quotations WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function recalculateQuotation(
  quotationId: string
): Promise<QuotationCostBreakdown> {
  const quotation = await getQuotationById(quotationId);
  if (!quotation) throw new Error("Quotation not found");

  const exchangeRate = toNumber(quotation.currency_rate_snapshot) || getExchangeRate();
  const passengerCounts: PassengerCounts = {
    adults: quotation.adults,
    children_with_bed: quotation.children_with_bed,
    children_without_bed: quotation.children_without_bed,
    infants: quotation.infants,
  };

  // Calculate hotels
  const hotelLines = await query(
    `SELECT qh.*, h.city as hotel_city, h.meal_plan_bb_premium_sar,
            COALESCE(hc.commission_rate_percent, 0) as commission_rate_percent
     FROM quotation_hotels qh
     JOIN hotels h ON h.id = qh.hotel_id
     LEFT JOIN LATERAL (
       SELECT commission_rate_percent FROM hotel_commissions
       WHERE hotel_id = h.id ORDER BY created_at DESC LIMIT 1
     ) hc ON true
     WHERE qh.quotation_id = $1`,
    [quotationId]
  );

  const hotelInputs: HotelPricingInput[] = [];
  const hotelDetails = [];
  let sharingHotelCost = 0;

  for (const line of hotelLines.rows) {
    if (line.booking_mode === "SHARING") {
      const hotelRow = await query(`SELECT sharing_rate_per_bed, city FROM hotels WHERE id = $1`, [
        line.hotel_id,
      ]);
      const rate = toNumber(hotelRow.rows[0]?.sharing_rate_per_bed);
      const pax = Math.max(1, Number(line.sharing_pax) || 0);
      const sharingTotal = calculateSharingStayCost({
        rate_per_bed_sar: rate,
        pax_with_bed: pax,
        nights: line.nights,
        view_modifier: (line.view_modifier || "NONE") as ViewModifier,
        city: hotelRow.rows[0]?.city || line.city,
      });
      sharingHotelCost += sharingTotal;
      await query(
        `UPDATE quotation_hotels SET subtotal_sar = $1, updated_at = NOW() WHERE id = $2`,
        [sharingTotal, line.id]
      );
      continue;
    }

    const seasonsResult = await query<HotelSeason>(
      `SELECT * FROM hotel_seasons WHERE hotel_id = $1 ORDER BY start_date`,
      [line.hotel_id]
    );

    const roomTypes = [
      { type: line.room_type_1, qty: line.quantity_1 },
      { type: line.room_type_2, qty: line.quantity_2 },
    ].filter((r) => r.type && r.qty > 0 && r.type !== "Sharing");

    for (const rt of roomTypes) {
      const roomResult = await query(
        `SELECT base_price_sar FROM hotel_rooms
         WHERE hotel_id = $1 AND room_type = $2`,
        [line.hotel_id, rt.type]
      );
      const basePrice = toNumber(roomResult.rows[0]?.base_price_sar);

      const input: HotelPricingInput = {
        room_type: rt.type,
        base_price_sar: basePrice,
        quantity: rt.qty,
        nights: line.nights,
        view_modifier: (line.view_modifier || "NONE") as ViewModifier,
        meal_plan: (line.meal_plan || "RO") as MealPlan,
        meal_premium_sar: toNumber(line.meal_plan_bb_premium_sar),
        city: line.hotel_city || line.city,
        check_in_date: line.check_in_date,
        check_out_date: line.check_out_date,
        seasons: seasonsResult.rows.map((s) => ({
          ...s,
          season_multiplier: toNumber(s.season_multiplier),
        })),
        commission_rate_percent: toNumber(line.commission_rate_percent),
      };
      hotelInputs.push(input);
    }
  }

  const { total: privateHotelCost, details: hotelPricingDetails } =
    calculateHotelLineTotal(hotelInputs);
  const hotelCost = Math.round((privateHotelCost + sharingHotelCost) * 100) / 100;
  hotelDetails.push(...hotelPricingDetails);

  // Update hotel line subtotals (private rooms)
  for (const line of hotelLines.rows) {
    if (line.booking_mode === "SHARING") continue;
    const lineInputs = hotelInputs.filter(
      (i) =>
        (i.room_type === line.room_type_1 && line.quantity_1 > 0) ||
        (i.room_type === line.room_type_2 && line.quantity_2 > 0)
    );
    const lineTotal = lineInputs.reduce((s, inp) => {
      const result = calculateRoomCost(inp);
      return s + result.net_cost_sar;
    }, 0);

    await query(
      `UPDATE quotation_hotels SET subtotal_sar = $1, updated_at = NOW() WHERE id = $2`,
      [lineTotal, line.id]
    );
  }

  // Calculate transport
  const transportLines = await query(
    `SELECT qt.*, tr.name as route_name
     FROM quotation_transport qt
     JOIN transport_routes tr ON tr.id = qt.route_id
     WHERE qt.quotation_id = $1`,
    [quotationId]
  );

  let transportCost = 0;
  const transportDetails: Array<{ route: string; vehicle_type: string; cost_sar: number }> = [];

  for (const line of transportLines.rows) {
    let cost: number;
    if (line.is_sharing) {
      cost = toNumber(line.seat_rate_sar) * line.quantity_pax;
    } else {
      const rateResult = await query(
        `SELECT price_sar FROM transport_rates
         WHERE route_id = $1 AND vehicle_type = $2`,
        [line.route_id, line.vehicle_type]
      );
      cost = toNumber(rateResult.rows[0]?.price_sar);
    }
    transportCost += cost;
    transportDetails.push({
      route: line.route_name,
      vehicle_type: line.vehicle_type,
      cost_sar: cost,
    });

    await query(
      `UPDATE quotation_transport SET total_cost_sar = $1 WHERE id = $2`,
      [cost, line.id]
    );
  }
  transportCost = Math.round(transportCost * 100) / 100;

  // Calculate visa
  const travelDateResult = await query(
    `SELECT MIN(check_in_date) as travel_date FROM quotation_hotels WHERE quotation_id = $1`,
    [quotationId]
  );
  const referenceDate = travelDateResult.rows[0]?.travel_date as string | undefined;

  const visaLines = await query(
    `SELECT qv.*, vc.name as category_name, vc.adult_child_rate_sar, vc.infant_rate_sar,
            vc.summer_rate_multiplier, vc.winter_rate_multiplier, vc.id as visa_category_id_ref
     FROM quotation_visas qv
     JOIN visa_categories vc ON vc.id = qv.visa_category_id
     WHERE qv.quotation_id = $1`,
    [quotationId]
  );

  let visaCost = 0;
  let visaDetails = { category: "", adults_children_cost: 0, infants_cost: 0 };

  for (const line of visaLines.rows) {
    const rates = resolveVisaRatesForQuotation(line as VisaRateSource, referenceDate);
    const visaResult = calculateVisaCost(
      {
        adult_child_rate_sar: rates.adult_child_rate_sar,
        infant_rate_sar: rates.infant_rate_sar,
        counts: passengerCounts,
      },
      exchangeRate
    );
    visaCost += visaResult.total_cost_sar;
    visaDetails = {
      category: line.category_name,
      adults_children_cost: visaResult.adults_children_cost_sar,
      infants_cost: visaResult.infants_cost_sar,
    };

    await query(
      `UPDATE quotation_visas SET total_cost_sar = $1, total_cost_pkr = $2 WHERE id = $3`,
      [visaResult.total_cost_sar, visaResult.total_cost_pkr, line.id]
    );

    await logVisaUsage(line.visa_category_id, quotationId, rates.season);
  }
  visaCost = Math.round(visaCost * 100) / 100;

  const transfersCost = toNumber(quotation.transfers_cost_sar);
  const upgradesCost = toNumber(quotation.upgrades_cost_sar);
  const flightsPkr = toNumber(quotation.flights_cost_pkr);
  const discount = toNumber(quotation.discount_amount_sar);

  const totals = calculateQuotationTotals({
    hotel_cost_sar: hotelCost,
    transport_cost_sar: transportCost,
    visa_cost_sar: visaCost,
    transfers_cost_sar: transfersCost,
    upgrades_cost_sar: upgradesCost,
    flights_cost_pkr: flightsPkr,
    discount_amount_sar: discount,
    exchange_rate: exchangeRate,
  });

  await query(
    `UPDATE quotations SET
      hotel_cost_sar = $1, transport_cost_sar = $2, visa_cost_sar = $3,
      total_cost_sar = $4, total_cost_pkr = $5, updated_at = NOW()
     WHERE id = $6`,
    [
      hotelCost,
      transportCost,
      visaCost,
      totals.total_cost_sar,
      totals.total_cost_pkr,
      quotationId,
    ]
  );

  return {
    hotel_cost_sar: hotelCost,
    transport_cost_sar: transportCost,
    visa_cost_sar: visaCost,
    transfers_cost_sar: transfersCost,
    upgrades_cost_sar: upgradesCost,
    flights_cost_pkr: flightsPkr,
    subtotal_sar: totals.subtotal_sar,
    discount_amount_sar: discount,
    total_cost_sar: totals.total_cost_sar,
    total_cost_pkr: totals.total_cost_pkr,
    currency_rate: exchangeRate,
    hotel_details: hotelPricingDetails,
    transport_details: transportDetails,
    visa_details: visaDetails,
  };
}

export async function capturePriceSnapshot(quotationId: string): Promise<void> {
  const breakdown = await recalculateQuotation(quotationId);

  const hotelSnapshots = await query(
    `SELECT hr.hotel_id, hr.quotation_id, jsonb_build_object(
      'rooms', (SELECT jsonb_agg(jsonb_build_object(
        'room_type', room_type, 'base_price_sar', base_price_sar
      )) FROM hotel_rooms WHERE hotel_id = hr.hotel_id),
      'seasons', (SELECT jsonb_agg(jsonb_build_object(
        'start_date', start_date, 'end_date', end_date, 'multiplier', season_multiplier
      )) FROM hotel_seasons WHERE hotel_id = hr.hotel_id)
    ) as snapshot
    FROM hotel_rate_snapshots hr
    WHERE hr.quotation_id = $1`,
    [quotationId]
  );

  const transportSnap = await query(
    `SELECT route_id, vehicle_type, price_sar FROM transport_rates`
  );
  const visaSnap = await query(`SELECT * FROM visa_categories`);

  const snapshot = {
    captured_at: new Date().toISOString(),
    exchange_rate: breakdown.currency_rate,
    hotels: breakdown.hotel_details,
    transport: transportSnap.rows,
    visa: visaSnap.rows,
    totals: breakdown,
  };

  await query(
    `UPDATE quotations SET price_snapshot_json = $1, currency_rate_snapshot = $2 WHERE id = $3`,
    [JSON.stringify(snapshot), breakdown.currency_rate, quotationId]
  );
}

export function getPassengerCountsFromQuotation(q: QuotationRow): PassengerCounts {
  return {
    adults: q.adults,
    children_with_bed: q.children_with_bed,
    children_without_bed: q.children_without_bed,
    infants: q.infants,
  };
}

export { getTransportPassengerCount };
