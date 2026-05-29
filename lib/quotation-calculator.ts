/**
 * Quotation calculator — core PKR totals and full Umrah package breakdown.
 */
import type {
  GlobalSettings,
  Hotel,
  TransportRate,
  TransportRoute,
  VehicleType,
  VisaCategory,
} from "@/app/page"
import { getClientPaxBreakdown } from "@/lib/client-pax"
import { sanitizeNonNegative } from "@/lib/hotel-utils"
import type {
  CalculationResult,
  ClientDetails,
  ItineraryStay,
  TransportSelection,
} from "@/lib/quotation-types"
import {
  calculateStayCostSar,
  calculateTicketCostPkr,
} from "@/lib/quotation-utils"
import {
  calculateRouteCostSar,
  calculateZiyaratCostsSar,
  validateVehicleCapacity,
} from "@/lib/transport-cost-utils"

export interface QuotationPaxInput {
  adults: number
  childrenWithBed: number
  childrenWithoutBed: number
  infants: number
}

export interface QuotationTicketRates {
  adult: number
  child: number
  infant: number
}

/** Aggregated SAR/PKR inputs for API-level total calculation. */
export interface SimpleQuotationInput {
  pax: QuotationPaxInput
  visaRateSar: number
  stayCostSar: number
  transportCostSar: number
  ticketRates: QuotationTicketRates
  currencyRate: number
  profitMargin: number
  profitType: "fixed" | "percentage"
}

export interface SimpleQuotationBreakdown {
  visaCost: number
  ticketCost: number
  stayCost: number
  transportCost: number
  subtotal: number
  profit: number
  grandTotal: number
  perPerson: number
}

function sarToPkr(sar: number, currencyRate: number): number {
  return Math.round(sanitizeNonNegative(sar) * sanitizeNonNegative(currencyRate))
}

/**
 * Core quotation math: SAR components converted to PKR, tickets in PKR, then profit.
 * Used by POST /api/quotations after stay, visa, and transport SAR are computed.
 */
export function calculateQuotation(input: SimpleQuotationInput): SimpleQuotationBreakdown {
  const adults = sanitizeNonNegative(input.pax.adults)
  const children =
    sanitizeNonNegative(input.pax.childrenWithBed) +
    sanitizeNonNegative(input.pax.childrenWithoutBed)
  const infants = sanitizeNonNegative(input.pax.infants)
  const totalPax = adults + children + infants

  const visaRate = sanitizeNonNegative(input.visaRateSar)
  const stayCostSar = sanitizeNonNegative(input.stayCostSar)
  const transportCostSar = sanitizeNonNegative(input.transportCostSar)
  const currencyRate = sanitizeNonNegative(input.currencyRate)

  const visaCostSar = (adults + children) * visaRate
  const ticketCostPkr =
    adults * sanitizeNonNegative(input.ticketRates.adult) +
    children * sanitizeNonNegative(input.ticketRates.child) +
    infants * sanitizeNonNegative(input.ticketRates.infant)

  const visaCostPkr = sarToPkr(visaCostSar, currencyRate)
  const stayCostPkr = sarToPkr(stayCostSar, currencyRate)
  const transportCostPkr = sarToPkr(transportCostSar, currencyRate)

  const subtotalPkr = visaCostPkr + stayCostPkr + transportCostPkr + ticketCostPkr

  const profitAmount =
    input.profitType === "fixed"
      ? sanitizeNonNegative(input.profitMargin)
      : Math.round(subtotalPkr * (sanitizeNonNegative(input.profitMargin) / 100))

  const grandTotal = subtotalPkr + profitAmount
  const perPerson = totalPax > 0 ? Math.round(grandTotal / totalPax) : 0

  return {
    visaCost: visaCostPkr,
    ticketCost: ticketCostPkr,
    stayCost: stayCostPkr,
    transportCost: transportCostPkr,
    subtotal: subtotalPkr,
    profit: profitAmount,
    grandTotal,
    perPerson,
  }
}

export interface QuotationCalculationInput {
  client: ClientDetails
  stays: ItineraryStay[]
  transport: TransportSelection
  visaCategoryId: string
  hotels: Hotel[]
  vehicleTypes: VehicleType[]
  transportRoutes: TransportRoute[]
  transportRates: TransportRate[]
  visaCategories: VisaCategory[]
  settings: GlobalSettings
}

function calculateVisaCostSar(
  visa: VisaCategory | undefined,
  client: ClientDetails,
  paxForVisa: number
): number {
  if (!visa) return 0
  const perPersonFees = visa.processingFeeSar + visa.serviceChargeSar
  return (
    visa.adultRateSar * (client.adults + client.childrenWithBed) +
    visa.childRateSar * client.childrenWithoutBed +
    visa.infantRateSar * client.infants +
    perPersonFees * paxForVisa
  )
}

/** Full quotation breakdown for staff UI, PDF, and line-item persistence. */
export function calculateFullQuotation(input: QuotationCalculationInput): CalculationResult {
  const {
    client,
    stays,
    transport,
    visaCategoryId,
    hotels,
    vehicleTypes,
    transportRoutes,
    transportRates,
    visaCategories,
    settings,
  } = input

  const warnings: string[] = []
  const pax = getClientPaxBreakdown(client)
  const selectedVisa = visaCategories.find((visa) => visa.id === visaCategoryId)
  const { currencyRate } = settings

  const stayCosts = stays.map((stay) => {
    const hotel = hotels.find((item) => item.id === stay.hotelId)
    const { sar, weekendNights } = calculateStayCostSar(
      hotel,
      stay,
      settings,
      pax.paxForHotel
    )
    return {
      stayId: stay.id,
      city: stay.city,
      hotelName: hotel?.name ?? "—",
      sar,
      pkr: sarToPkr(sar, currencyRate),
      nights: stay.nights,
      weekendNights,
    }
  })

  const totalHotelSar = stayCosts.reduce((sum, stay) => sum + stay.sar, 0)
  const visaCostSar = calculateVisaCostSar(selectedVisa, client, pax.paxForVisa)
  const ticketCostPkr = calculateTicketCostPkr(client)

  const transportCosts: CalculationResult["transportCosts"] = []
  for (const routeId of transport.selectedRoutes) {
    const vehicleId = transport.vehicleSelections[routeId]
    const route = transportRoutes.find((item) => item.id === routeId)
    const costSar = calculateRouteCostSar(
      routeId,
      vehicleId,
      pax.totalPax,
      transportRates
    )

    if (costSar === null || !route) continue

    const validation = validateVehicleCapacity(vehicleTypes, vehicleId, pax.totalPax)
    if (!validation.valid) {
      warnings.push(`${route.name}: ${validation.message}`)
    }

    transportCosts.push({
      routeId,
      sar: costSar,
      pkr: sarToPkr(costSar, currencyRate),
      isSharing: vehicleId === "sharing",
    })
  }

  const ziyaratSar = calculateZiyaratCostsSar(transport, transportRates, pax.totalPax)
  const totalTransportSar = transportCosts.reduce((sum, item) => sum + item.sar, 0)
  const groundHandlingSar = settings.groundHandlingFee * pax.totalPax

  const subtotalPkr =
    sarToPkr(
      visaCostSar + totalHotelSar + totalTransportSar + ziyaratSar + groundHandlingSar,
      currencyRate
    ) + ticketCostPkr

  const profitPkr =
    settings.profitType === "fixed"
      ? settings.profitMargin * pax.paxForVisa
      : Math.round(subtotalPkr * (settings.profitMargin / 100))

  const grandTotalPkr = subtotalPkr + profitPkr
  const perPersonPkr = pax.totalPax > 0 ? Math.round(grandTotalPkr / pax.totalPax) : 0

  return {
    totalPax: pax.totalPax,
    paxForVisa: pax.paxForVisa,
    paxForHotel: pax.paxForHotel,
    visaCost: {
      sar: visaCostSar,
      pkr: sarToPkr(visaCostSar, currencyRate),
    },
    ticketCost: {
      pkr: ticketCostPkr,
      adultPax: pax.adultPax,
      childPax: pax.childPax,
      infantPax: pax.infantPax,
      rateAdult: sanitizeNonNegative(client.ticketRateAdult),
      rateChild: sanitizeNonNegative(client.ticketRateChild),
      rateInfant: sanitizeNonNegative(client.ticketRateInfant),
    },
    stayCosts,
    transportCosts,
    ziyaratCosts: { sar: ziyaratSar, pkr: sarToPkr(ziyaratSar, currencyRate) },
    groundHandlingCost: {
      sar: groundHandlingSar,
      pkr: sarToPkr(groundHandlingSar, currencyRate),
    },
    subtotal: { pkr: subtotalPkr },
    profit: { pkr: profitPkr },
    grandTotal: { pkr: grandTotalPkr },
    perPerson: { pkr: perPersonPkr },
    vehicleWarnings: warnings,
  }
}
