import type {
  GlobalSettings,
  TransportRate,
  TransportRoute,
  VehicleType,
  VisaCategory,
} from "@/app/page"

export const defaultVehicleTypes: VehicleType[] = [
  { id: "car", name: "car", displayName: "Car (Camry/Sonata)", minPax: 1, maxPax: 3 },
  { id: "van", name: "van", displayName: "Family Van (H1/Staria/Starex)", minPax: 3, maxPax: 6 },
  { id: "gmc", name: "gmc", displayName: "Luxury SUV (GMC)", minPax: 3, maxPax: 6 },
  { id: "hiace", name: "hiace", displayName: "Toyota Hiace", minPax: 6, maxPax: 9 },
  { id: "coaster", name: "coaster", displayName: "Coaster", minPax: 9, maxPax: 18 },
  { id: "bus", name: "bus", displayName: "Bus", minPax: 18, maxPax: 49 },
  { id: "sharing", name: "sharing", displayName: "Sharing Bus (Per Pax)", minPax: 1, maxPax: 1 },
]

export const defaultTransportRoutes: TransportRoute[] = [
  { id: "jed-mak", code: "JED-MAK", name: "Jeddah Airport to Makkah Hotel", description: "Airport pickup to Makkah", isSharing: false, sortOrder: 1 },
  { id: "mak-med", code: "MAK-MED", name: "Makkah Hotel to Madinah Hotel", description: "Makkah to Madinah intercity", isSharing: true, sortOrder: 2 },
  { id: "med-mak", code: "MED-MAK", name: "Madinah Hotel to Makkah Hotel", description: "Madinah to Makkah intercity", isSharing: true, sortOrder: 3 },
  { id: "mak-jed", code: "MAK-JED", name: "Makkah Hotel to Jeddah Airport", description: "Makkah to Jeddah airport drop", isSharing: true, sortOrder: 4 },
  { id: "med-jed", code: "MED-JED", name: "Madinah Hotel to Jeddah Airport", description: "Madinah to Jeddah airport drop", isSharing: false, sortOrder: 5 },
  { id: "jed-med", code: "JED-MED", name: "Jeddah Airport to Madinah Hotel", description: "Direct long route arrival", isSharing: false, sortOrder: 6 },
  { id: "med-apt-htl", code: "MED_APT-HTL", name: "Madinah Airport to Madinah Hotel", description: "Madinah airport arrival", isSharing: false, sortOrder: 7 },
  { id: "med-htl-apt", code: "MED_HTL-APT", name: "Madinah Hotel to Madinah Airport", description: "Madinah airport departure", isSharing: false, sortOrder: 8 },
  { id: "round-trip-1", code: "ROUND-TRIP", name: "Full Round Trip (JED-MAK-MED-JED)", description: "Complete circuit via Jeddah", isSharing: false, sortOrder: 9 },
  { id: "mak-ziyarat", code: "MAK-ZIY", name: "Makkah Ziyarat", description: "Makkah holy sites tour", isSharing: true, sortOrder: 12 },
  { id: "med-ziyarat", code: "MED-ZIY", name: "Madinah Ziyarat", description: "Madinah holy sites tour", isSharing: true, sortOrder: 13 },
]

const baseTransportRates: Record<string, Record<string, number>> = {
  "jed-mak": { car: 350, van: 500, gmc: 700, hiace: 600, coaster: 900, bus: 1200 },
  "mak-med": { car: 1200, van: 1600, gmc: 2200, hiace: 1800, coaster: 2500, bus: 3500, sharing: 120 },
  "med-mak": { car: 1200, van: 1600, gmc: 2200, hiace: 1800, coaster: 2500, bus: 3500, sharing: 120 },
  "med-jed": { car: 1400, van: 1900, gmc: 2600, hiace: 2100, coaster: 3000, bus: 4200 },
  "mak-jed": { car: 350, van: 500, gmc: 700, hiace: 600, coaster: 900, bus: 1200, sharing: 60 },
  "jed-med": { car: 1500, van: 2000, gmc: 2800, hiace: 2300, coaster: 3200, bus: 4500 },
  "med-apt-htl": { car: 200, van: 300, gmc: 450, hiace: 350, coaster: 500, bus: 700 },
  "med-htl-apt": { car: 200, van: 300, gmc: 450, hiace: 350, coaster: 500, bus: 700 },
  "round-trip-1": { car: 2500, van: 3500, gmc: 4500, hiace: 3800, coaster: 5500, bus: 7500 },
  "mak-ziyarat": { car: 300, van: 450, gmc: 600, hiace: 500, coaster: 700, bus: 1000, sharing: 50 },
  "med-ziyarat": { car: 300, van: 450, gmc: 600, hiace: 500, coaster: 700, bus: 1000, sharing: 50 },
}

export const defaultTransportRates: TransportRate[] = Object.entries(baseTransportRates).flatMap(
  ([routeId, vehicleRates]) =>
    Object.entries(vehicleRates).map(([vehicleId, rateSar]) => ({
      id: `${routeId}-${vehicleId}`,
      routeId,
      vehicleId,
      rateSar,
    }))
)

export const defaultVisaCategories: VisaCategory[] = [
  { id: "visa-no-brn", name: "Visa Without BRN", code: "NO-BRN", adultRateSar: 535, childRateSar: 535, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-brn-21", name: "Visa With BRN (21 Days)", code: "BRN-21", adultRateSar: 450, childRateSar: 450, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-brn-28", name: "Visa With BRN (28 Days)", code: "BRN-28", adultRateSar: 480, childRateSar: 480, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-iqama", name: "Long-Stay Visa With Iqama", code: "IQAMA", adultRateSar: 350, childRateSar: 350, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-no-iqama", name: "Long-Stay Visa Without Iqama", code: "NO-IQAMA", adultRateSar: 600, childRateSar: 600, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
]

export const fallbackGlobalSettings: GlobalSettings = {
  currencyRate: 74.5,
  profitMargin: 15000,
  profitType: "fixed",
  groundHandlingFee: 50,
  hideRatesFromStaff: false,
  agentMargins: { category1: 0, category2: 5000, category3: 3000 },
  enableMealOptions: true,
  enableViewOptions: true,
  enableQuintupleSextuple: true,
}

export interface DbOrganizationRow {
  id: string
  currency_rate?: number | null
  profit_margin_fixed?: number | null
  profit_margin_percent?: number | null
  profit_type?: "fixed" | "percentage" | null
  ground_handling_fee?: number | null
  enable_meal_options?: boolean | null
  enable_view_options?: boolean | null
}

/** Map organization DB row to calculator settings. */
export function mapOrganizationToGlobalSettings(org: DbOrganizationRow): GlobalSettings {
  const profitType = org.profit_type ?? fallbackGlobalSettings.profitType
  const profitMargin =
    profitType === "fixed"
      ? (org.profit_margin_fixed ?? fallbackGlobalSettings.profitMargin)
      : (org.profit_margin_percent ?? 10)

  return {
    ...fallbackGlobalSettings,
    currencyRate: org.currency_rate ?? fallbackGlobalSettings.currencyRate,
    profitType,
    profitMargin,
    groundHandlingFee: org.ground_handling_fee ?? fallbackGlobalSettings.groundHandlingFee,
    enableMealOptions: org.enable_meal_options ?? fallbackGlobalSettings.enableMealOptions,
    enableViewOptions: org.enable_view_options ?? fallbackGlobalSettings.enableViewOptions,
  }
}

/** Server-safe quotation number (no in-memory counter). */
export function generateQuotationNumber(): string {
  const year = new Date().getFullYear()
  const suffix = Date.now().toString().slice(-6)
  return `ST-${year}-${suffix}`
}
