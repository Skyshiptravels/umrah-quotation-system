import { PassengerCounts } from "@/types";

export interface TransportCostInput {
  vehicle_type: string;
  price_sar: number;
  is_sharing: boolean;
  seat_rate_sar?: number;
  passenger_count: number;
  route_count?: number;
}

/** Private vehicle: full vehicle cost per route (NOT per person) */
export function calculatePrivateTransportCost(
  pricePerRoute: number,
  routeCount = 1
): number {
  return Math.round(pricePerRoute * routeCount * 100) / 100;
}

/** Sharing bus: seat rate × seats needed (excludes infants) */
export function calculateSharingTransportCost(
  seatRate: number,
  seatsNeeded: number
): number {
  return Math.round(seatRate * seatsNeeded * 100) / 100;
}

export function calculateTransportLineCost(input: TransportCostInput): number {
  if (input.is_sharing) {
    const rate = input.seat_rate_sar ?? input.price_sar;
    return calculateSharingTransportCost(rate, input.passenger_count);
  }
  return calculatePrivateTransportCost(input.price_sar, input.route_count ?? 1);
}

export function calculateTotalTransportCost(
  lines: TransportCostInput[]
): number {
  const total = lines.reduce(
    (sum, line) => sum + calculateTransportLineCost(line),
    0
  );
  return Math.round(total * 100) / 100;
}

export function getTransportPassengerCount(counts: PassengerCounts): number {
  return (
    counts.adults +
    counts.children_with_bed +
    counts.children_without_bed
  );
}

export function validateVehicleCapacity(
  passengerCount: number,
  capacity: number,
  isSharing: boolean
): boolean {
  if (isSharing) return true;
  return passengerCount <= capacity;
}
