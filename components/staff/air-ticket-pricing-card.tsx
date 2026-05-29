"use client"

import type { ClientDetails } from "@/lib/quotation-types"
import type { TicketRates } from "@/lib/client-pax"
import { getClientPaxBreakdown } from "@/lib/client-pax"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plane } from "lucide-react"
import { sanitizeNonNegative } from "@/lib/hotel-utils"
import { parseNonNegativeInput } from "@/lib/hotel-rates"

interface AirTicketPricingCardProps {
  client: ClientDetails
  onChange: (client: ClientDetails) => void
}

type TicketRateField = keyof TicketRates

const TICKET_FIELDS: { id: TicketRateField; label: string; paxLabel: (c: ClientDetails) => string; paxCount: (c: ClientDetails) => number }[] = [
  {
    id: "ticketRateAdult",
    label: "Ticket Rate (Adult)",
    paxLabel: (c) => `${c.adults} adult${c.adults === 1 ? "" : "s"}`,
    paxCount: (c) => c.adults,
  },
  {
    id: "ticketRateChild",
    label: "Ticket Rate (Child)",
    paxLabel: (c) => {
      const count = c.childrenWithBed + c.childrenWithoutBed
      return `${count} child${count === 1 ? "" : "ren"}`
    },
    paxCount: (c) => c.childrenWithBed + c.childrenWithoutBed,
  },
  {
    id: "ticketRateInfant",
    label: "Ticket Rate (Infant)",
    paxLabel: (c) => `${c.infants} infant${c.infants === 1 ? "" : "s"}`,
    paxCount: (c) => c.infants,
  },
]

export function AirTicketPricingCard({ client, onChange }: AirTicketPricingCardProps) {
  const pax = getClientPaxBreakdown(client)

  const updateRate = (field: TicketRateField, raw: string) => {
    onChange({
      ...client,
      [field]: sanitizeNonNegative(parseNonNegativeInput(raw)),
    })
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Plane className="w-4 h-4 text-primary" />
        Air Ticket Pricing (PKR)
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TICKET_FIELDS.map(({ id, label, paxLabel, paxCount }) => {
          const rate = sanitizeNonNegative(client[id])
          const lineTotal = paxCount(client) * rate
          return (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                type="number"
                min="0"
                value={client[id]}
                onChange={(e) => updateRate(id, e.target.value)}
                onFocus={(e) => e.target.select()}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                × {paxLabel(client)} = {lineTotal.toLocaleString()} PKR
              </p>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Ticket subtotal:{" "}
        {(
          pax.adultPax * sanitizeNonNegative(client.ticketRateAdult) +
          pax.childPax * sanitizeNonNegative(client.ticketRateChild) +
          pax.infantPax * sanitizeNonNegative(client.ticketRateInfant)
        ).toLocaleString()}{" "}
        PKR
      </p>
    </div>
  )
}
