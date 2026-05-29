"use client"

import type { ClientDetails } from "@/lib/quotation-types"
import { getClientPaxBreakdown } from "@/lib/client-pax"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Users, Baby } from "lucide-react"
import { sanitizeNonNegative } from "@/lib/hotel-utils"
import { parseNonNegativeInput } from "@/lib/hotel-rates"

interface ClientDetailsCardProps {
  client: ClientDetails
  onChange: (client: ClientDetails) => void
}

function updatePaxField(
  client: ClientDetails,
  field: keyof Pick<
    ClientDetails,
    "adults" | "childrenWithBed" | "childrenWithoutBed" | "infants"
  >,
  raw: string
): ClientDetails {
  return { ...client, [field]: sanitizeNonNegative(parseNonNegativeInput(raw)) }
}

export function ClientDetailsCard({ client, onChange }: ClientDetailsCardProps) {
  const { totalPax, paxForVisa, paxForHotel } = getClientPaxBreakdown(client)

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <UserIcon className="w-5 h-5 text-primary" />
          Client Details
        </CardTitle>
        <CardDescription>Enter traveler information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="Enter client name"
              value={client.name}
              onChange={(e) => onChange({ ...client, name: e.target.value })}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientMobile">Mobile Number (WhatsApp)</Label>
            <Input
              id="clientMobile"
              type="tel"
              placeholder="+92 300 0000000"
              value={client.mobile}
              onChange={(e) => onChange({ ...client, mobile: e.target.value })}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email Address</Label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="client@email.com"
              value={client.email}
              onChange={(e) => onChange({ ...client, email: e.target.value })}
              className="bg-input border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="adults" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              Adults
            </Label>
            <Input
              id="adults"
              type="number"
              min="0"
              value={client.adults}
              onChange={(e) => onChange(updatePaxField(client, "adults", e.target.value))}
              onFocus={(e) => e.target.select()}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="childrenWithBed" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              Children (with bed)
            </Label>
            <Input
              id="childrenWithBed"
              type="number"
              min="0"
              value={client.childrenWithBed}
              onChange={(e) =>
                onChange(updatePaxField(client, "childrenWithBed", e.target.value))
              }
              onFocus={(e) => e.target.select()}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="childrenWithoutBed" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              Children (no bed)
            </Label>
            <Input
              id="childrenWithoutBed"
              type="number"
              min="0"
              value={client.childrenWithoutBed}
              onChange={(e) =>
                onChange(updatePaxField(client, "childrenWithoutBed", e.target.value))
              }
              onFocus={(e) => e.target.select()}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="infants" className="flex items-center gap-2">
              <Baby className="w-4 h-4 text-muted-foreground" />
              Infants
            </Label>
            <Input
              id="infants"
              type="number"
              min="0"
              value={client.infants}
              onChange={(e) => onChange(updatePaxField(client, "infants", e.target.value))}
              onFocus={(e) => e.target.select()}
              className="bg-input border-border"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Users className="w-3 h-3 mr-1" />
            Total: {totalPax} pax
          </Badge>
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Visa: {paxForVisa}
          </Badge>
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Hotel beds: {paxForHotel}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
