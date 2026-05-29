import type { ClientDetails } from "@/lib/quotation-types"

export type { TicketRates } from "@/lib/quotation-types"

export interface ClientPaxBreakdown {
  totalPax: number
  paxForVisa: number
  paxForHotel: number
  childPax: number
  adultPax: number
  infantPax: number
}

export const DEFAULT_CLIENT_DETAILS: ClientDetails = {
  name: "",
  mobile: "",
  email: "",
  adults: 2,
  childrenWithBed: 0,
  childrenWithoutBed: 0,
  infants: 0,
  ticketRateAdult: 0,
  ticketRateChild: 0,
  ticketRateInfant: 0,
}

/** Derive passenger counts used across visa, hotel, transport, and tickets. */
export function getClientPaxBreakdown(client: ClientDetails): ClientPaxBreakdown {
  const childPax = client.childrenWithBed + client.childrenWithoutBed
  const paxForVisa = client.adults + childPax
  const paxForHotel = client.adults + client.childrenWithBed

  return {
    adultPax: client.adults,
    childPax,
    infantPax: client.infants,
    paxForVisa,
    paxForHotel,
    totalPax: paxForVisa + client.infants,
  }
}
