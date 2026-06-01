import type { Hotel } from "@/app/page"

export type HotelCity = "makkah" | "madinah"
export type HotelTier = "economy" | "standard" | "luxury"

export interface DbHotelRow {
  id: string
  organization_id: string
  name: string
  city: HotelCity
  tier: HotelTier
  rates: Hotel["rates"]
  distance_km?: number | null
  meal_plan_enabled?: boolean | null
  view_type_enabled?: boolean | null
  seasons?: Hotel["seasons"] | null
}

export interface HotelApiResponse {
  id: string
  name: string
  city: HotelCity
  tier: HotelTier
  rates: Hotel["rates"]
}

export function mapDbHotelToApi(row: DbHotelRow): HotelApiResponse {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    tier: row.tier,
    rates: row.rates,
  }
}

export function mapDbHotelToCalculator(row: DbHotelRow): Hotel {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    tier: row.tier,
    distanceKm: row.distance_km ?? 0,
    rates: row.rates,
    seasons: row.seasons ?? undefined,
    mealPlanEnabled: row.meal_plan_enabled ?? true,
    viewTypeEnabled: row.view_type_enabled ?? true,
  }
}
