import {
  HotelPricingInput,
  HotelPricingResult,
  HotelSeason,
  PassengerCounts,
  RoomAssignment,
  RoomAssignmentOption,
  STANDARD_ROOM_TYPES,
  VIEW_MODIFIERS,
  ViewModifier,
} from "@/types";

export function getBedsNeeded(counts: PassengerCounts): number {
  return counts.adults + counts.children_with_bed;
}

export function getTransportPassengers(counts: PassengerCounts): number {
  return (
    counts.adults +
    counts.children_with_bed +
    counts.children_without_bed
  );
}

export function getVisaAdultsChildren(counts: PassengerCounts): number {
  return (
    counts.adults +
    counts.children_with_bed +
    counts.children_without_bed
  );
}

function getViewModifierSar(view: ViewModifier, city: string): number {
  if (city.toLowerCase() !== "makkah") return 0;
  return VIEW_MODIFIERS[view];
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getSeasonMultiplierForDate(
  date: string,
  seasons: HotelSeason[]
): number {
  const d = new Date(date);
  for (const season of seasons) {
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    if (d >= start && d <= end) {
      return season.season_multiplier;
    }
  }
  return 1.0;
}

/** Calculate weighted average season multiplier across booking dates */
export function calculateSeasonMultiplierForStay(
  checkIn: string,
  checkOut: string,
  seasons: HotelSeason[]
): { averageMultiplier: number; dailyBreakdown: Array<{ date: string; multiplier: number }> } {
  const nights = daysBetween(checkIn, checkOut);
  if (nights === 0) return { averageMultiplier: 1.0, dailyBreakdown: [] };

  const dailyBreakdown: Array<{ date: string; multiplier: number }> = [];
  let totalMultiplier = 0;

  const current = new Date(checkIn);
  for (let i = 0; i < nights; i++) {
    const dateStr = current.toISOString().split("T")[0];
    const mult = getSeasonMultiplierForDate(dateStr, seasons);
    dailyBreakdown.push({ date: dateStr, multiplier: mult });
    totalMultiplier += mult;
    current.setDate(current.getDate() + 1);
  }

  return {
    averageMultiplier: totalMultiplier / nights,
    dailyBreakdown,
  };
}

/** Calculate hotel room cost with exact formula from spec */
export function calculateRoomCost(
  input: HotelPricingInput
): HotelPricingResult {
  const viewSar = getViewModifierSar(input.view_modifier, input.city);
  const priceWithView = input.base_price_sar + viewSar;

  const { averageMultiplier, dailyBreakdown } =
    calculateSeasonMultiplierForStay(
      input.check_in_date,
      input.check_out_date,
      input.seasons
    );

  // For cross-season bookings: calculate daily and sum
  let priceWithSeason: number;
  if (dailyBreakdown.length > 0 && new Set(dailyBreakdown.map((d) => d.multiplier)).size > 1) {
    const dailyRate = priceWithView;
    let totalForStay = 0;
    for (const day of dailyBreakdown) {
      totalForStay += dailyRate * day.multiplier;
    }
    priceWithSeason = totalForStay / input.nights;
  } else {
    priceWithSeason = priceWithView * averageMultiplier;
  }

  const mealPremium =
    input.meal_plan === "BB" ? input.meal_premium_sar : 0;
  const priceWithMeal = priceWithSeason + mealPremium;
  const subtotalPerRoom = priceWithMeal * input.nights;
  const roomTotal = subtotalPerRoom * input.quantity;
  const commissionSar = roomTotal * (input.commission_rate_percent / 100);
  const netCost = roomTotal - commissionSar;

  const breakdown = [
    `Base: ${input.base_price_sar} SAR`,
    viewSar > 0 ? `View modifier: +${viewSar} SAR` : null,
    `Season multiplier: ${averageMultiplier.toFixed(2)}`,
    mealPremium > 0 ? `Meal plan (BB): +${mealPremium} SAR/night` : null,
    `Nights: ${input.nights}`,
    `Quantity: ${input.quantity}`,
    `Room total: ${roomTotal.toFixed(2)} SAR`,
    input.commission_rate_percent > 0
      ? `Commission (${input.commission_rate_percent}%): -${commissionSar.toFixed(2)} SAR`
      : null,
    `Net cost: ${netCost.toFixed(2)} SAR`,
  ].filter(Boolean) as string[];

  return {
    room_type: input.room_type,
    quantity: input.quantity,
    nights: input.nights,
    price_per_night_sar: Math.round(priceWithMeal * 100) / 100,
    room_total_sar: Math.round(roomTotal * 100) / 100,
    commission_sar: Math.round(commissionSar * 100) / 100,
    net_cost_sar: Math.round(netCost * 100) / 100,
    breakdown,
  };
}

/** Sharing mode: per-bed rate × guests with bed × nights (+ Makkah view per bed/night) */
export function calculateSharingStayCost(params: {
  rate_per_bed_sar: number;
  pax_with_bed: number;
  nights: number;
  view_modifier: ViewModifier;
  city: string;
}): number {
  const viewSar = getViewModifierSar(params.view_modifier, params.city);
  const nightlyPerBed = params.rate_per_bed_sar + viewSar;
  return Math.round(nightlyPerBed * params.pax_with_bed * params.nights * 100) / 100;
}

export function calculateHotelLineTotal(
  inputs: HotelPricingInput[]
): { total: number; details: HotelPricingResult[] } {
  const details = inputs.map(calculateRoomCost);
  const total = details.reduce((sum, d) => sum + d.net_cost_sar, 0);
  return { total: Math.round(total * 100) / 100, details };
}

/** Generate room assignment options for given beds needed */
export function generateRoomAssignmentOptions(
  bedsNeeded: number,
  availableRoomTypes: string[]
): RoomAssignmentOption[] {
  const types = availableRoomTypes
    .filter((t) => STANDARD_ROOM_TYPES[t])
    .map((t) => ({ type: t, beds: STANDARD_ROOM_TYPES[t] }))
    .sort((a, b) => b.beds - a.beds);

  const options: RoomAssignmentOption[] = [];
  const seen = new Set<string>();

  function addOption(rooms: Array<{ room_type: string; quantity: number; beds: number }>) {
    const totalBeds = rooms.reduce((s, r) => s + r.beds * r.quantity, 0);
    if (totalBeds < bedsNeeded) return;

    const key = rooms
      .map((r) => `${r.room_type}x${r.quantity}`)
      .sort()
      .join("+");
    if (seen.has(key)) return;
    seen.add(key);

    options.push({
      label: rooms.map((r) => `${r.quantity}× ${r.room_type}`).join(" + "),
      assignment: {
        rooms,
        total_beds: totalBeds,
        beds_needed: bedsNeeded,
        is_optimal: totalBeds === bedsNeeded,
      },
    });
  }

  // Greedy optimal: use largest rooms first
  function greedyAssign(): Array<{ room_type: string; quantity: number; beds: number }> {
    let remaining = bedsNeeded;
    const result: Array<{ room_type: string; quantity: number; beds: number }> = [];

    for (const { type, beds } of types) {
      if (remaining <= 0) break;
      const qty = Math.floor(remaining / beds);
      if (qty > 0) {
        result.push({ room_type: type, quantity: qty, beds: beds * qty });
        remaining -= qty * beds;
      }
    }

    if (remaining > 0) {
      const smallestFit = [...types].reverse().find((t) => t.beds >= remaining);
      if (smallestFit) {
        const existing = result.find((r) => r.room_type === smallestFit.type);
        if (existing) {
          existing.quantity += 1;
          existing.beds += smallestFit.beds;
        } else {
          result.push({
            room_type: smallestFit.type,
            quantity: 1,
            beds: smallestFit.beds,
          });
        }
      }
    }

    return result.map((r) => ({
      room_type: r.room_type,
      quantity: r.quantity,
      beds: STANDARD_ROOM_TYPES[r.room_type] * r.quantity,
    }));
  }

  const optimal = greedyAssign();
  addOption(optimal);

  // Wasteful option: round up using largest room type only
  if (types.length > 0) {
    const largest = types[0];
    const qty = Math.ceil(bedsNeeded / largest.beds);
    addOption([
      {
        room_type: largest.type,
        quantity: qty,
        beds: largest.beds * qty,
      },
    ]);
  }

  // Option with mix of two largest types
  if (types.length >= 2) {
    const [a, b] = types;
    for (let qa = 0; qa <= Math.ceil(bedsNeeded / a.beds); qa++) {
      const bedsA = qa * a.beds;
      const remaining = bedsNeeded - bedsA;
      if (remaining <= 0) {
        if (qa > 0) addOption([{ room_type: a.type, quantity: qa, beds: bedsA }]);
        continue;
      }
      const qb = Math.ceil(remaining / b.beds);
      const rooms = [];
      if (qa > 0) rooms.push({ room_type: a.type, quantity: qa, beds: bedsA });
      rooms.push({ room_type: b.type, quantity: qb, beds: qb * b.beds });
      addOption(rooms);
    }
  }

  return options.sort((x, y) => {
    if (x.assignment.is_optimal && !y.assignment.is_optimal) return -1;
    if (!x.assignment.is_optimal && y.assignment.is_optimal) return 1;
    return x.assignment.total_beds - y.assignment.total_beds;
  });
}

export function validateSeasons(
  seasons: Array<{ start_date: string; end_date: string; season_multiplier: number }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (seasons.length === 0) {
    errors.push("At least one season is required");
    return { valid: false, errors };
  }

  const sorted = [...seasons].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    if (new Date(sorted[i].end_date) < new Date(sorted[i].start_date)) {
      errors.push(`Season ${i + 1}: end_date must be >= start_date`);
    }
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].end_date);
      const currStart = new Date(sorted[i].start_date);
      const nextDay = new Date(prevEnd);
      nextDay.setDate(nextDay.getDate() + 1);

      if (currStart.getTime() <= prevEnd.getTime()) {
        errors.push(`Season ${i + 1}: overlaps with previous season`);
      }
      if (currStart.getTime() > nextDay.getTime()) {
        errors.push(
          `Gap between seasons: ${sorted[i - 1].end_date} and ${sorted[i].start_date}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
