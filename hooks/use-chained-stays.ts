import { useEffect, type Dispatch, type SetStateAction } from "react"
import type { ItineraryStay } from "@/lib/quotation-types"
import { chainItineraryCheckIns } from "@/lib/quotation-utils"

/** Build a stable key so chained check-ins recompute when itinerary inputs change. */
export function buildStaysChainKey(stays: ItineraryStay[]): string {
  return stays
    .map(
      (stay) =>
        `${stay.id}:${stay.checkIn}:${stay.nights}:${stay.transitBreakNights}:${stay.hotelId}`
    )
    .join("|")
}

/** Auto-chain check-in dates from prior stay checkout plus transit nights. */
export function useChainedStays(
  stays: ItineraryStay[],
  setStays: Dispatch<SetStateAction<ItineraryStay[]>>
): void {
  const chainKey = buildStaysChainKey(stays)

  useEffect(() => {
    setStays((prev) => {
      const chained = chainItineraryCheckIns(prev)
      const unchanged =
        chained.length === prev.length &&
        chained.every(
          (stay, index) =>
            stay.checkIn === prev[index].checkIn && stay.hotelId === prev[index].hotelId
        )
      return unchanged ? prev : chained
    })
  }, [chainKey, setStays])
}
