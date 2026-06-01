import type {
  GlobalSettings,
  Hotel,
  MealPlan,
  RoomType,
  ViewType,
} from "@/app/page"
import type { ClientDetails, ItineraryStay, QuotationData } from "@/lib/quotation-types"
import { getClientPaxBreakdown } from "@/lib/client-pax"
import { ALL_ROOM_TYPES, getActiveRoomTypesFromRates, sanitizeNonNegative } from "@/lib/hotel-utils"

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  double: "Double (2 beds)",
  triple: "Triple (3 beds)",
  quad: "Quad (4 beds)",
  quintuple: "Quintuple (5 beds)",
  sextuple: "Sextuple (6 beds)",
  sharing: "Per Bed (Sharing)",
}

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  ro: "Room Only",
  bb: "Bed & Breakfast",
}

export const VIEW_LABELS: Record<ViewType, string> = {
  city: "City View",
  haram: "Haram View",
}

export const CITY_LABELS: Record<ItineraryStay["city"], string> = {
  makkah: "Makkah",
  madinah: "Madinah",
}

/** Meal plan is available when enabled on the hotel in admin and globally. */
export function isHotelMealPlanEnabled(hotel: Hotel | undefined, settings: GlobalSettings): boolean {
  if (!hotel || !settings.enableMealOptions) return false
  if (hotel.mealPlanEnabled === false) return false
  if (hotel.mealPlanEnabled === true) return true
  return ALL_ROOM_TYPES.some((roomType) => (hotel.rates[roomType]?.bb?.city?.weekday ?? 0) > 0)
}

/** View type is available when enabled on the hotel in admin and globally. */
export function isHotelViewTypeEnabled(hotel: Hotel | undefined, settings: GlobalSettings): boolean {
  if (!hotel || !settings.enableViewOptions) return false
  if (hotel.viewTypeEnabled === false) return false
  if (hotel.viewTypeEnabled === true) return true
  return ALL_ROOM_TYPES.some((roomType) => (hotel.rates[roomType]?.ro?.haram?.weekday ?? 0) > 0)
}

export function getResolvedMealPlan(
  hotel: Hotel | undefined,
  settings: GlobalSettings,
  selected: MealPlan
): MealPlan {
  return isHotelMealPlanEnabled(hotel, settings) ? selected : "ro"
}

export function getResolvedViewType(
  hotel: Hotel | undefined,
  settings: GlobalSettings,
  selected: ViewType
): ViewType {
  return isHotelViewTypeEnabled(hotel, settings) ? selected : "city"
}

export function countWeekendNights(checkIn: string, nights: number): number {
  if (!checkIn || nights <= 0) return 0
  let count = 0
  const startDate = new Date(`${checkIn}T00:00:00`)
  for (let i = 0; i < nights; i++) {
    const current = new Date(startDate)
    current.setDate(current.getDate() + i)
    const day = current.getDay()
    if (day === 4 || day === 5) count++
  }
  return count
}

export function calculateCheckout(checkIn: string, nights: number): string {
  if (!checkIn || nights <= 0) return ""
  const date = new Date(`${checkIn}T00:00:00`)
  date.setDate(date.getDate() + nights)
  return date.toISOString().split("T")[0]
}

/** Chain check-in dates using prior stay checkout + optional transit break. */
export function chainItineraryCheckIns(stays: ItineraryStay[]): ItineraryStay[] {
  if (stays.length === 0) return stays
  const next = stays.map((stay) => ({ ...stay }))
  for (let i = 1; i < next.length; i++) {
    const previous = next[i - 1]
    if (!previous.checkIn || previous.nights <= 0) continue
    const checkout = calculateCheckout(previous.checkIn, previous.nights)
    const transitDate = new Date(`${checkout}T00:00:00`)
    transitDate.setDate(transitDate.getDate() + (previous.transitBreakNights || 0))
    next[i] = {
      ...next[i],
      checkIn: transitDate.toISOString().split("T")[0],
    }
  }
  return next
}

const ROOM_CAPACITIES: Record<RoomType, number> = {
  double: 2,
  triple: 3,
  quad: 4,
  quintuple: 5,
  sextuple: 6,
  sharing: 1,
}

export function calculateRoomsNeeded(roomType: RoomType, paxForHotel: number): number {
  if (roomType === "sharing") return paxForHotel
  const capacity = ROOM_CAPACITIES[roomType]
  return Math.ceil(paxForHotel / capacity)
}

export function calculateStayCostSar(
  hotel: Hotel | undefined,
  stay: ItineraryStay,
  settings: GlobalSettings,
  paxForHotel: number
): { sar: number; weekendNights: number } {
  if (!hotel || stay.nights <= 0) return { sar: 0, weekendNights: 0 }

  const mealPlan = getResolvedMealPlan(hotel, settings, stay.mealPlan)
  const viewType = getResolvedViewType(hotel, settings, stay.viewType)
  const rates = hotel.rates[stay.roomType]?.[mealPlan]?.[viewType] ?? { weekday: 0, weekend: 0 }
  const weekendNights = countWeekendNights(stay.checkIn, stay.nights)
  const weekdayNights = stay.nights - weekendNights
  const roomsNeeded = calculateRoomsNeeded(stay.roomType, paxForHotel)
  const sar =
    (rates.weekday * weekdayNights + rates.weekend * weekendNights) * roomsNeeded

  return { sar, weekendNights }
}

export function calculateTicketCostPkr(client: ClientDetails): number {
  const { adultPax, childPax, infantPax } = getClientPaxBreakdown(client)
  const adultRate = sanitizeNonNegative(client.ticketRateAdult)
  const childRate = sanitizeNonNegative(client.ticketRateChild)
  const infantRate = sanitizeNonNegative(client.ticketRateInfant)
  return adultPax * adultRate + childPax * childRate + infantPax * infantRate
}

export function createDefaultStays(hotels: Hotel[]): ItineraryStay[] {
  const makkahHotel = hotels.find((hotel) => hotel.city === "makkah")
  const madinahHotel = hotels.find((hotel) => hotel.city === "madinah")
  return [
    {
      id: "stay-makkah",
      city: "makkah",
      hotelId: makkahHotel?.id ?? "",
      nights: 4,
      checkIn: "",
      roomType: "quad",
      mealPlan: "ro",
      viewType: "city",
      transitBreakNights: 0,
      transitBreakLocation: "",
    },
    {
      id: "stay-madinah",
      city: "madinah",
      hotelId: madinahHotel?.id ?? "",
      nights: 4,
      checkIn: "",
      roomType: "quad",
      mealPlan: "ro",
      viewType: "city",
      transitBreakNights: 0,
      transitBreakLocation: "",
    },
  ]
}

export function generateWhatsAppMessage(
  quotation: QuotationData,
  hotels: Hotel[],
  vehicleTypes: { id: string; displayName: string }[],
  transportRoutes: { id: string; code: string; name: string }[],
  visaCategories: { id: string; name: string }[],
  settings: GlobalSettings
): string {
  const { client, accommodation, transport, calculations, visaCategoryId } = quotation
  const selectedVisa = visaCategories.find((visa) => visa.id === visaCategoryId)

  const transportLines = transport.selectedRoutes
    .map((routeId) => {
      const route = transportRoutes.find((item) => item.id === routeId)
      const vehicle = vehicleTypes.find((item) => item.id === transport.vehicleSelections[routeId])
      return `   ${route?.code}: ${vehicle?.displayName || "N/A"}`
    })
    .join("\n")

  const stayLines = accommodation.stays
    .map((stay, index) => {
      const hotel = hotels.find((item) => item.id === stay.hotelId)
      const stayCost = calculations.stayCosts.find((item) => item.stayId === stay.id)
      const meal = isHotelMealPlanEnabled(hotel, settings)
        ? MEAL_PLAN_LABELS[getResolvedMealPlan(hotel, settings, stay.mealPlan)]
        : null
      const view = isHotelViewTypeEnabled(hotel, settings)
        ? VIEW_LABELS[getResolvedViewType(hotel, settings, stay.viewType)]
        : null
      return `*${CITY_LABELS[stay.city].toUpperCase()} STAY ${index + 1}*
   Hotel: ${hotel?.name || "N/A"}
   Nights: ${stay.nights}
   Room: ${ROOM_TYPE_LABELS[stay.roomType]}
${meal ? `   Meal: ${meal}` : ""}
${view ? `   View: ${view}` : ""}
${stay.checkIn ? `   Check-in: ${new Date(stay.checkIn).toLocaleDateString("en-GB")}` : ""}
${stayCost && stayCost.weekendNights > 0 ? `   (${stayCost.weekendNights} weekend nights)` : ""}`
    })
    .join("\n\n")

  const ziyaratLines: string[] = []
  if (transport.makkahZiyarat) {
    const vehicle = vehicleTypes.find((item) => item.id === transport.vehicleSelections["mak-ziyarat"])
    ziyaratLines.push(`   Makkah Ziyarat: ${vehicle?.displayName || "Sharing Bus"}`)
  }
  if (transport.madinahZiyarat) {
    const vehicle = vehicleTypes.find((item) => item.id === transport.vehicleSelections["med-ziyarat"])
    ziyaratLines.push(`   Madinah Ziyarat: ${vehicle?.displayName || "Sharing Bus"}`)
  }

  const hotelTotalPkr = calculations.stayCosts.reduce((sum, stay) => sum + stay.pkr, 0)

  return `
*SKYSHIP TRAVELS*
Your Journey, Our Passion
━━━━━━━━━━━━━━━━━━━━━━━━━━

*UMRAH PACKAGE QUOTATION*
━━━━━━━━━━━━━━━━━━━━━━━━━━

*Client:* ${client.name || "Valued Customer"}
${client.mobile ? `*Mobile:* ${client.mobile}` : ""}
${client.email ? `*Email:* ${client.email}` : ""}

*TRAVELERS*
   Adults: ${client.adults}
   Children (with bed): ${client.childrenWithBed}
   Children (no bed): ${client.childrenWithoutBed}
   Infants: ${client.infants}
   *Total:* ${calculations.totalPax} persons

━━━━━━━━━━━━━━━━━━━━━━━━━━

*VISA*
   Type: ${selectedVisa?.name || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━

*ACCOMMODATION*
${stayLines}

━━━━━━━━━━━━━━━━━━━━━━━━━━

*TRANSPORT*
${transportLines}
${ziyaratLines.length > 0 ? `\n*ZIYARAT*\n${ziyaratLines.join("\n")}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━

*PACKAGE COST (PKR)*

   Visa: ${calculations.visaCost.pkr.toLocaleString()}
   Air Tickets: ${calculations.ticketCost.pkr.toLocaleString()}
   Hotels: ${hotelTotalPkr.toLocaleString()}
   Transport: ${calculations.transportCosts.reduce((sum, item) => sum + item.pkr, 0).toLocaleString()}
${calculations.ziyaratCosts.pkr > 0 ? `   Ziyarat: ${calculations.ziyaratCosts.pkr.toLocaleString()}` : ""}
   Ground Handling: ${calculations.groundHandlingCost.pkr.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━

*GRAND TOTAL: ${calculations.grandTotal.pkr.toLocaleString()} PKR*
Per Person: ${calculations.perPerson.pkr.toLocaleString()} PKR

━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim()
}
