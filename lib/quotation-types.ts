import type { MealPlan, RoomType, ViewType } from "@/app/page"

export type StayCity = "makkah" | "madinah"

/** Per-person air ticket rates in PKR (staff-entered). */
export interface TicketRates {
  ticketRateAdult: number
  ticketRateChild: number
  ticketRateInfant: number
}

export interface ClientDetails extends TicketRates {
  name: string
  mobile: string
  email: string
  adults: number
  childrenWithBed: number
  childrenWithoutBed: number
  infants: number
}

export interface ItineraryStay {
  id: string
  city: StayCity
  hotelId: string
  nights: number
  checkIn: string
  roomType: RoomType
  mealPlan: MealPlan
  viewType: ViewType
  transitBreakNights: number
  transitBreakLocation: string
}

export interface AccommodationDetails {
  stays: ItineraryStay[]
}

export interface TransportSelection {
  selectedRoutes: string[]
  vehicleSelections: Record<string, string>
  makkahZiyarat: boolean
  madinahZiyarat: boolean
}

export interface StayCostBreakdown {
  stayId: string
  city: StayCity
  hotelName: string
  sar: number
  pkr: number
  nights: number
  weekendNights: number
}

export interface CalculationResult {
  totalPax: number
  paxForVisa: number
  paxForHotel: number
  visaCost: { sar: number; pkr: number }
  ticketCost: {
    pkr: number
    adultPax: number
    childPax: number
    infantPax: number
    rateAdult: number
    rateChild: number
    rateInfant: number
  }
  stayCosts: StayCostBreakdown[]
  transportCosts: { routeId: string; sar: number; pkr: number; isSharing: boolean }[]
  ziyaratCosts: { sar: number; pkr: number }
  groundHandlingCost: { sar: number; pkr: number }
  subtotal: { pkr: number }
  profit: { pkr: number }
  grandTotal: { pkr: number }
  perPerson: { pkr: number }
  vehicleWarnings: string[]
}

export interface QuotationData {
  client: ClientDetails
  accommodation: AccommodationDetails
  transport: TransportSelection
  visaCategoryId: string
  calculations: CalculationResult
}
