import type { Hotel, HotelSeason, MealPlan, RoomType, ViewType } from "@/app/page"
import { BASE_SEASON_NAME } from "@/lib/hotel-utils"

const ROOM_TYPES: RoomType[] = ["double", "triple", "quad", "quintuple", "sextuple", "sharing"]

const ROOM_MULTIPLIERS: Record<RoomType, number> = {
  double: 1,
  triple: 0.8,
  quad: 0.65,
  quintuple: 0.55,
  sextuple: 0.48,
  sharing: 0.4,
}

/** Build a full rate matrix from a base double-room weekday (RO, city) rate. */
export function createHotelRates(baseDouble: number): Hotel["rates"] {
  const rates = {} as Hotel["rates"]

  for (const roomType of ROOM_TYPES) {
    const multiplier = ROOM_MULTIPLIERS[roomType]
    const base = Math.round(baseDouble * multiplier)
    rates[roomType] = buildRoomRateTier(base)
  }

  return rates
}

function buildRoomRateTier(base: number) {
  const haramBase = Math.round(base * 1.4)
  const bbBase = Math.round(base * 1.15)
  const haramBbBase = Math.round(base * 1.4 * 1.15)

  const tier = (weekday: number): { weekday: number; weekend: number } => ({
    weekday,
    weekend: Math.round(weekday * 1.25),
  })

  return {
    ro: {
      city: tier(base),
      haram: tier(haramBase),
    },
    bb: {
      city: tier(bbBase),
      haram: tier(haramBbBase),
    },
  } satisfies Hotel["rates"][RoomType]
}

export function createBaseSeason(rates: Hotel["rates"], id = "base-season"): HotelSeason {
  return {
    id,
    name: BASE_SEASON_NAME,
    startDate: "",
    endDate: "",
    isBaseSeason: true,
    rates,
  }
}

export function createDefaultSeasonRates(baseDouble = 400): HotelSeason {
  const rates = createHotelRates(baseDouble)
  return createBaseSeason(rates, Date.now().toString())
}

/** Parse numeric form input into a safe non-negative number. */
export function parseNonNegativeInput(raw: string): number {
  const parsed = parseFloat(raw)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}
