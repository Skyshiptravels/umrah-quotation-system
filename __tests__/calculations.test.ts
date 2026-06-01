import {
  calculateRoomCost,
  calculateHotelLineTotal,
  generateRoomAssignmentOptions,
  getBedsNeeded,
  validateSeasons,
} from "@/lib/calculations/hotel";
import {
  calculatePrivateTransportCost,
  calculateSharingTransportCost,
  calculateTotalTransportCost,
  getTransportPassengerCount,
} from "@/lib/calculations/transport";
import { calculateVisaCost } from "@/lib/calculations/visa";
import {
  calculateQuotationTotals,
  calculateStaffMargin,
  calculateMaxDiscountRequest,
  calculateCommissionAfterDiscount,
} from "@/lib/calculations/quotation";

describe("Hotel Pricing - Verified 9 People Makkah Scenario", () => {
  const seasons = [
    {
      id: "1",
      hotel_id: "h1",
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      season_multiplier: 1.0,
    },
  ];

  test("Quad room: 228 base + 200 Haram View × 4 nights = 1,712 SAR", () => {
    const result = calculateRoomCost({
      room_type: "Quad",
      base_price_sar: 228,
      quantity: 1,
      nights: 4,
      view_modifier: "HARAM_VIEW",
      meal_plan: "RO",
      meal_premium_sar: 50,
      city: "Makkah",
      check_in_date: "2025-04-01",
      check_out_date: "2025-04-05",
      seasons,
      commission_rate_percent: 0,
    });
    expect(result.room_total_sar).toBe(1712);
    expect(result.net_cost_sar).toBe(1712);
  });

  test("Triple room: 280 base + 200 Haram View × 4 nights = 1,920 SAR", () => {
    const result = calculateRoomCost({
      room_type: "Triple",
      base_price_sar: 280,
      quantity: 1,
      nights: 4,
      view_modifier: "HARAM_VIEW",
      meal_plan: "RO",
      meal_premium_sar: 50,
      city: "Makkah",
      check_in_date: "2025-04-01",
      check_out_date: "2025-04-05",
      seasons,
      commission_rate_percent: 0,
    });
    expect(result.room_total_sar).toBe(1920);
  });

  test("Makkah hotel subtotal = 3,632 SAR", () => {
    const { total } = calculateHotelLineTotal([
      {
        room_type: "Quad",
        base_price_sar: 228,
        quantity: 1,
        nights: 4,
        view_modifier: "HARAM_VIEW",
        meal_plan: "RO",
        meal_premium_sar: 50,
        city: "Makkah",
        check_in_date: "2025-04-01",
        check_out_date: "2025-04-05",
        seasons,
        commission_rate_percent: 0,
      },
      {
        room_type: "Triple",
        base_price_sar: 280,
        quantity: 1,
        nights: 4,
        view_modifier: "HARAM_VIEW",
        meal_plan: "RO",
        meal_premium_sar: 50,
        city: "Makkah",
        check_in_date: "2025-04-01",
        check_out_date: "2025-04-05",
        seasons,
        commission_rate_percent: 0,
      },
    ]);
    expect(total).toBe(3632);
  });

  test("Full hotels Makkah + Madinah = 5,416 SAR", () => {
    const { total } = calculateHotelLineTotal([
      {
        room_type: "Quad",
        base_price_sar: 228,
        quantity: 1,
        nights: 4,
        view_modifier: "HARAM_VIEW",
        meal_plan: "RO",
        meal_premium_sar: 50,
        city: "Makkah",
        check_in_date: "2025-04-01",
        check_out_date: "2025-04-05",
        seasons,
        commission_rate_percent: 0,
      },
      {
        room_type: "Triple",
        base_price_sar: 280,
        quantity: 1,
        nights: 4,
        view_modifier: "HARAM_VIEW",
        meal_plan: "RO",
        meal_premium_sar: 50,
        city: "Makkah",
        check_in_date: "2025-04-01",
        check_out_date: "2025-04-05",
        seasons,
        commission_rate_percent: 0,
      },
      {
        room_type: "Quad",
        base_price_sar: 178,
        quantity: 1,
        nights: 4,
        view_modifier: "NONE",
        meal_plan: "RO",
        meal_premium_sar: 50,
        city: "Madinah",
        check_in_date: "2025-04-05",
        check_out_date: "2025-04-09",
        seasons,
        commission_rate_percent: 0,
      },
      {
        room_type: "Triple",
        base_price_sar: 268,
        quantity: 1,
        nights: 4,
        view_modifier: "NONE",
        meal_plan: "RO",
        meal_premium_sar: 50,
        city: "Madinah",
        check_in_date: "2025-04-05",
        check_out_date: "2025-04-09",
        seasons,
        commission_rate_percent: 0,
      },
    ]);
    expect(total).toBe(5416);
  });
});

describe("Room Assignment", () => {
  test("7 beds needed for 4 adults + 3 children with bed", () => {
    const beds = getBedsNeeded({
      adults: 4,
      children_with_bed: 3,
      children_without_bed: 1,
      infants: 1,
    });
    expect(beds).toBe(7);
  });

  test("Suggests 1 Quad + 1 Triple as optimal option", () => {
    const options = generateRoomAssignmentOptions(7, ["Quad", "Triple", "Double"]);
    const optimal = options.find((o) => o.assignment.is_optimal);
    expect(optimal).toBeDefined();
    expect(optimal!.assignment.total_beds).toBe(7);
  });
});

describe("Transport Pricing", () => {
  test("Toyota Hiace 3 routes = 1,800 SAR (NOT per person)", () => {
    const cost = calculatePrivateTransportCost(600, 3);
    expect(cost).toBe(1800);
  });

  test("Sharing bus 8 seats @ 120 = 960 SAR", () => {
    const cost = calculateSharingTransportCost(120, 8);
    expect(cost).toBe(960);
  });

  test("9 people transport: 8 passengers (infant free)", () => {
    const pax = getTransportPassengerCount({
      adults: 4,
      children_with_bed: 3,
      children_without_bed: 1,
      infants: 1,
    });
    expect(pax).toBe(8);
  });

  test("3 routes Hiace total = 1,800 SAR", () => {
    const total = calculateTotalTransportCost([
      { vehicle_type: "Toyota Hiace", price_sar: 600, is_sharing: false, passenger_count: 8 },
      { vehicle_type: "Toyota Hiace", price_sar: 600, is_sharing: false, passenger_count: 8 },
      { vehicle_type: "Toyota Hiace", price_sar: 600, is_sharing: false, passenger_count: 8 },
    ]);
    expect(total).toBe(1800);
  });
});

describe("Visa Pricing", () => {
  test("9 people BRN 28 Days = 4,330 SAR", () => {
    const result = calculateVisaCost({
      adult_child_rate_sar: 480,
      counts: {
        adults: 4,
        children_with_bed: 3,
        children_without_bed: 1,
        infants: 1,
      },
    });
    expect(result.adults_children_cost_sar).toBe(3840);
    expect(result.infants_cost_sar).toBe(490);
    expect(result.total_cost_sar).toBe(4330);
    expect(result.total_cost_pkr).toBe(322585);
  });
});

describe("Grand Total - Complete 9 People Scenario", () => {
  test("Total SAR = 12,896 (includes transfers 1,350)", () => {
    const totals = calculateQuotationTotals({
      hotel_cost_sar: 5416,
      transport_cost_sar: 1800,
      visa_cost_sar: 4330,
      transfers_cost_sar: 1350,
      flights_cost_pkr: 31500,
      exchange_rate: 74.5,
    });
    expect(totals.subtotal_sar).toBe(12896);
    expect(totals.total_cost_sar).toBe(12896);
    expect(totals.total_cost_pkr).toBe(354085);
  });
});

describe("Commission & Discount", () => {
  test("Staff margin 10% of 12,896 = 1,289.60", () => {
    expect(calculateStaffMargin(12896, 10)).toBe(1289.6);
  });

  test("Max discount request 50% of margin = 644.80", () => {
    expect(calculateMaxDiscountRequest(1289.6)).toBe(644.8);
  });

  test("Commission after 400 SAR discount = 889.60", () => {
    expect(calculateCommissionAfterDiscount(1289.6, 400)).toBe(889.6);
  });
});

describe("Season Validation", () => {
  test("Valid continuous seasons pass", () => {
    const result = validateSeasons([
      { start_date: "2025-01-01", end_date: "2025-03-31", season_multiplier: 1.5 },
      { start_date: "2025-04-01", end_date: "2025-07-31", season_multiplier: 1.0 },
      { start_date: "2025-08-01", end_date: "2025-12-31", season_multiplier: 1.2 },
    ]);
    expect(result.valid).toBe(true);
  });

  test("Gap in seasons fails validation", () => {
    const result = validateSeasons([
      { start_date: "2025-01-01", end_date: "2025-03-31", season_multiplier: 1.5 },
      { start_date: "2025-04-05", end_date: "2025-12-31", season_multiplier: 1.0 },
    ]);
    expect(result.valid).toBe(false);
  });
});

describe("Visa seasonal pricing", () => {
  test("May uses summer multiplier", () => {
    const { getVisaSeasonFromDate, getEffectiveVisaRates } = require("@/lib/visa-season");
    expect(getVisaSeasonFromDate("2026-06-15")).toBe("SUMMER");
    const rates = getEffectiveVisaRates(480, 490, 1.1, 1.0, "2026-06-15");
    expect(rates.adult_child_rate_sar).toBe(528);
    expect(rates.infant_rate_sar).toBe(539);
    expect(rates.season).toBe("SUMMER");
  });

  test("January uses winter multiplier", () => {
    const { getEffectiveVisaRates } = require("@/lib/visa-season");
    const rates = getEffectiveVisaRates(480, 490, 1.1, 0.95, "2026-01-10");
    expect(rates.adult_child_rate_sar).toBe(456);
    expect(rates.season).toBe("WINTER");
  });
});
