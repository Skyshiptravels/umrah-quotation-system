import { RoomRateInput, RoomTypeKey } from "@/types/hotel-admin";
import { ROOM_TYPE_META } from "@/types/hotel-admin";

const OCCUPANCY: Record<RoomTypeKey, number> = {
  Single: 1,
  Double: 2,
  Triple: 3,
  Quad: 4,
  Quint: 5,
};

export function parseDistanceMeters(label: string): number | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const range = trimmed.match(/(\d+)\s*[-–]\s*(\d+)\s*M/i);
  if (range) return Math.round((parseInt(range[1], 10) + parseInt(range[2], 10)) / 2);
  const single = trimmed.match(/(\d+)\s*M/i);
  if (single) return parseInt(single[1], 10);
  return null;
}

/** SHARING: multiply single bed rate by occupancy for full room rate */
export function calcSharingFullRates(
  singleBedRate: number,
  enabled: RoomTypeKey[]
): Record<RoomTypeKey, number> {
  const rates = {} as Record<RoomTypeKey, number>;
  for (const { key, occupancy } of ROOM_TYPE_META) {
    rates[key] = enabled.includes(key) ? Math.round(singleBedRate * occupancy * 100) / 100 : 0;
  }
  return rates;
}

/** Per-bed rate from full room rate */
export function perBedFromFullRoom(fullRoomRate: number, occupancy: number): number {
  if (occupancy <= 0) return 0;
  return Math.round((fullRoomRate / occupancy) * 100) / 100;
}

export function buildRoomRateInputs(
  rates: Record<RoomTypeKey, number>,
  enabled: RoomTypeKey[]
): RoomRateInput[] {
  return enabled
    .filter((key) => rates[key] > 0)
    .map((key) => ({
      room_type: key,
      full_room_rate_sar: rates[key],
    }));
}

export function formatShortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return "—";
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function displayDistance(
  distanceLabel?: string | null,
  distanceM?: number | null
): string {
  if (distanceLabel?.trim()) return distanceLabel.trim();
  if (distanceM) return `${distanceM} M`;
  return "—";
}

export { OCCUPANCY, ROOM_TYPE_META };
