import type { Hotel, HotelSeason, RoomType, TransportRate, VehicleType, VisaCategory } from "@/app/page"

export const ALL_ROOM_TYPES: RoomType[] = [
  "double",
  "triple",
  "quad",
  "quintuple",
  "sextuple",
  "sharing",
]

export const REQUIRED_ROOM_TYPES: RoomType[] = ["double", "triple", "quad", "sharing"]

export const PRICING_INPUT_CLASS =
  "w-28 min-w-[7rem] mx-auto px-2 text-center bg-input border-border"

export const BASE_SEASON_NAME = "Base Season"

/** Clamp numeric business inputs to non-negative values; invalid numbers become 0. */
export function sanitizeNonNegative(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0
  return Math.max(0, value)
}

export interface SeasonInlineValidation {
  name?: string
  startDate?: string
  endDate?: string
  requiredRates: Partial<Record<RoomType, string>>
}

export interface HotelInlineValidation {
  hotelName?: string
  seasons: Record<string, SeasonInlineValidation>
  hasErrors: boolean
}

export interface TransportInlineValidation {
  rates: Record<string, string>
  hasErrors: boolean
}

export interface VisaInlineValidation {
  adultChildRates: Record<string, string>
  hasErrors: boolean
}

export function getBaseRoomRate(
  rates: Hotel["rates"],
  roomType: RoomType
): number {
  return rates[roomType]?.ro?.city?.weekday ?? 0
}

export function getTransportInlineValidation(
  selectedRouteId: string,
  transportRates: TransportRate[],
  vehicleTypes: VehicleType[],
  allowSharing: boolean
): TransportInlineValidation {
  // Keep transport matrix validation centralized and consistent with other forms.
  const rates: Record<string, string> = {}
  let hasErrors = false

  for (const vehicle of vehicleTypes) {
    if (vehicle.id === "sharing" && !allowSharing) continue
    const rate = transportRates.find(
      (transportRate) =>
        transportRate.routeId === selectedRouteId && transportRate.vehicleId === vehicle.id
    )
    const safeRate = sanitizeNonNegative(rate?.rateSar ?? 0)
    if (safeRate <= 0) {
      rates[vehicle.id] = "Rate must be greater than 0."
      hasErrors = true
    }
  }

  return { rates, hasErrors }
}

export function getVisaInlineValidation(visaCategories: VisaCategory[]): VisaInlineValidation {
  // Keep visa inline validation centralized and aligned with hotel/transport UX.
  const adultChildRates: Record<string, string> = {}
  let hasErrors = false

  for (const visa of visaCategories) {
    const safeAdultRate = sanitizeNonNegative(visa.adultRateSar)
    const safeChildRate = sanitizeNonNegative(visa.childRateSar)
    if (safeAdultRate <= 0 || safeChildRate <= 0) {
      adultChildRates[visa.id] = "Adult/Child rate must be greater than 0."
      hasErrors = true
    }
  }

  return { adultChildRates, hasErrors }
}

export function isRoomTypeActive(rates: Hotel["rates"], roomType: RoomType): boolean {
  const rate = getBaseRoomRate(rates, roomType)
  return rate > 0 && !Number.isNaN(rate)
}

export function getActiveRoomTypesFromRates(rates: Hotel["rates"]): RoomType[] {
  return ALL_ROOM_TYPES.filter((roomType) => isRoomTypeActive(rates, roomType))
}

export function formatRoomRateDisplay(value: number): string {
  if (!value || Number.isNaN(value)) return "N/A"
  return String(value)
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function seasonsOverlap(a: HotelSeason, b: HotelSeason): boolean {
  const aStart = parseDate(a.startDate)
  const aEnd = parseDate(a.endDate)
  const bStart = parseDate(b.startDate)
  const bEnd = parseDate(b.endDate)

  if (!aStart || !aEnd || !bStart || !bEnd) return false
  if (aStart > aEnd || bStart > bEnd) return false

  return aStart <= bEnd && bStart <= aEnd
}

export function validateRequiredRates(rates: Hotel["rates"]): string[] {
  const errors: string[] = []
  const labels: Record<RoomType, string> = {
    double: "Double",
    triple: "Triple",
    quad: "Quad",
    quintuple: "Quint",
    sextuple: "Sext",
    sharing: "Sharing",
  }

  for (const roomType of REQUIRED_ROOM_TYPES) {
    if (!isRoomTypeActive(rates, roomType)) {
      errors.push(`${labels[roomType]} rate is required and must be greater than 0.`)
    }
  }

  return errors
}

export function validateSeasonOverlaps(seasons: HotelSeason[]): string[] {
  const errors: string[] = []
  const datedSeasons = seasons.filter((s) => s.startDate && s.endDate)

  for (let i = 0; i < datedSeasons.length; i++) {
    for (let j = i + 1; j < datedSeasons.length; j++) {
      if (seasonsOverlap(datedSeasons[i], datedSeasons[j])) {
        errors.push(
          `Season dates overlap: "${datedSeasons[i].name || "Unnamed"}" and "${datedSeasons[j].name || "Unnamed"}".`
        )
      }
    }
  }

  return errors
}

export function validateHotelNameUnique(
  name: string,
  hotels: Hotel[],
  excludeId?: string
): string | null {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return "Hotel name is required."

  const duplicate = hotels.find(
    (hotel) =>
      hotel.id !== excludeId && hotel.name.trim().toLowerCase() === normalized
  )

  if (duplicate) {
    return `A hotel named "${duplicate.name}" already exists.`
  }

  return null
}

export function validateHotelPayload(
  payload: {
    name: string
    seasons: HotelSeason[]
  },
  hotels: Hotel[],
  excludeId?: string
): string[] {
  // Central save-guard validation used by Add/Edit flows.
  const errors: string[] = []

  const nameError = validateHotelNameUnique(payload.name, hotels, excludeId)
  if (nameError) errors.push(nameError)

  if (!payload.seasons.length) {
    errors.push("At least one base season is required.")
  }

  const baseSeason = payload.seasons[0]
  if (baseSeason) {
    if (!baseSeason.name.trim()) {
      errors.push("Base season name is required.")
    }
    errors.push(...validateRequiredRates(baseSeason.rates))
  }

  for (const season of payload.seasons.slice(1)) {
    if (!season.name.trim()) {
      errors.push("Each additional season must have a name.")
    }
    if ((season.startDate && !season.endDate) || (!season.startDate && season.endDate)) {
      errors.push(`Season "${season.name || "Unnamed"}" must have both start and end dates.`)
    }
    if (season.startDate && season.endDate && season.startDate > season.endDate) {
      errors.push(`Season "${season.name || "Unnamed"}" has an invalid date range.`)
    }
  }

  errors.push(...validateSeasonOverlaps(payload.seasons))

  return errors
}

export function getHotelInlineValidation(
  payload: {
    name: string
    seasons: HotelSeason[]
  },
  hotels: Hotel[],
  excludeId?: string
): HotelInlineValidation {
  // Field-level validation map for inline UI feedback.
  const seasons: Record<string, SeasonInlineValidation> = {}
  let hasErrors = false

  const hotelName = validateHotelNameUnique(payload.name, hotels, excludeId) || undefined
  if (hotelName) hasErrors = true

  for (const season of payload.seasons) {
    const seasonErrors: SeasonInlineValidation = { requiredRates: {} }
    const requiredRateErrors = validateRequiredRates(season.rates)

    if (!season.name.trim()) {
      seasonErrors.name = "Season name is required."
      hasErrors = true
    }

    if ((season.startDate && !season.endDate) || (!season.startDate && season.endDate)) {
      seasonErrors.startDate = "Both start and end dates are required."
      seasonErrors.endDate = "Both start and end dates are required."
      hasErrors = true
    }

    if (season.startDate && season.endDate && season.startDate > season.endDate) {
      seasonErrors.endDate = "End date must be after start date."
      hasErrors = true
    }

    for (const roomType of REQUIRED_ROOM_TYPES) {
      const roomRate = getBaseRoomRate(season.rates, roomType)
      if (!roomRate || Number.isNaN(roomRate)) {
        seasonErrors.requiredRates[roomType] = "Required"
        hasErrors = true
      }
    }

    if (requiredRateErrors.length > 0) {
      hasErrors = true
    }

    seasons[season.id] = seasonErrors
  }

  const overlapErrors = validateSeasonOverlaps(payload.seasons)
  if (overlapErrors.length > 0) {
    hasErrors = true
    // Mark all dated seasons to make overlap issues visible inline.
    for (const season of payload.seasons) {
      if (season.startDate && season.endDate) {
        seasons[season.id] = {
          ...(seasons[season.id] || { requiredRates: {} }),
          startDate: seasons[season.id]?.startDate || "Date overlaps another season.",
          endDate: seasons[season.id]?.endDate || "Date overlaps another season.",
          requiredRates: seasons[season.id]?.requiredRates || {},
        }
      }
    }
  }

  return {
    hotelName,
    seasons,
    hasErrors,
  }
}

export function normalizeHotelSeasons(
  seasons: HotelSeason[],
  fallbackRates: Hotel["rates"]
): HotelSeason[] {
  // Ensure the first season is always the Base Season reference.
  if (seasons.length === 0) {
    return [
      {
        id: Date.now().toString(),
        name: BASE_SEASON_NAME,
        startDate: "",
        endDate: "",
        isBaseSeason: true,
        rates: fallbackRates,
      },
    ]
  }

  return seasons.map((season, index) => ({
    ...season,
    isBaseSeason: index === 0,
    name: index === 0 ? season.name.trim() || BASE_SEASON_NAME : season.name,
  }))
}

export function finalizeHotelForSave(
  hotel: Omit<Hotel, "updatedAt" | "updatedBy"> & Partial<Pick<Hotel, "updatedAt" | "updatedBy">>,
  updatedBy: string
): Hotel {
  // Persist normalized seasons + audit metadata in one place.
  const seasons = normalizeHotelSeasons(hotel.seasons ?? [], hotel.rates)
  const baseRates = seasons[0]?.rates ?? hotel.rates

  return {
    ...hotel,
    name: hotel.name.trim(),
    rates: baseRates,
    seasons,
    updatedAt: new Date().toISOString(),
    updatedBy,
  }
}

export function formatAuditLabel(hotel: Hotel): string {
  if (!hotel.updatedAt) return "—"
  const date = new Date(hotel.updatedAt)
  const formatted = date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  return hotel.updatedBy ? `${formatted} · ${hotel.updatedBy}` : formatted
}
