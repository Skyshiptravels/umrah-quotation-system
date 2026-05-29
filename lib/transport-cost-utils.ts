import type { TransportRate, VehicleType } from "@/app/page"
import type { TransportSelection } from "@/lib/quotation-types"

export interface VehicleCapacityResult {
  valid: boolean
  message: string
}

export function validateVehicleCapacity(
  vehicleTypes: VehicleType[],
  vehicleId: string,
  pax: number
): VehicleCapacityResult {
  const vehicle = vehicleTypes.find((item) => item.id === vehicleId)
  if (!vehicle) return { valid: false, message: "Vehicle not found" }
  if (vehicle.id === "sharing") return { valid: true, message: "" }
  if (pax > vehicle.maxPax) {
    return {
      valid: false,
      message: `${vehicle.displayName} max capacity is ${vehicle.maxPax} pax. You have ${pax} pax.`,
    }
  }
  return { valid: true, message: "" }
}

/** Sharing routes bill per passenger; private vehicles use a flat route rate. */
export function calculateRouteCostSar(
  routeId: string,
  vehicleId: string,
  totalPax: number,
  transportRates: TransportRate[]
): number | null {
  const rate = transportRates.find(
    (item) => item.routeId === routeId && item.vehicleId === vehicleId
  )
  if (!rate) return null
  return vehicleId === "sharing" ? rate.rateSar * totalPax : rate.rateSar
}

export function calculateZiyaratCostsSar(
  transport: TransportSelection,
  transportRates: TransportRate[],
  totalPax: number
): number {
  let total = 0

  if (transport.makkahZiyarat) {
    const vehicleId = transport.vehicleSelections["mak-ziyarat"] || "sharing"
    total += calculateRouteCostSar("mak-ziyarat", vehicleId, totalPax, transportRates) ?? 0
  }

  if (transport.madinahZiyarat) {
    const vehicleId = transport.vehicleSelections["med-ziyarat"] || "sharing"
    total += calculateRouteCostSar("med-ziyarat", vehicleId, totalPax, transportRates) ?? 0
  }

  return total
}
