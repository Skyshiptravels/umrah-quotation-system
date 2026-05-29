"use client"

import { useState, useMemo } from "react"
import type {
  Hotel,
  VehicleType,
  TransportRoute,
  TransportRate,
  VisaCategory,
  GlobalSettings,
  SavedQuotation,
  User,
} from "@/app/page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QuotationSummary } from "@/components/quotation-summary"
import { ClientDetailsCard } from "@/components/staff/client-details-card"
import { AirTicketPricingCard } from "@/components/staff/air-ticket-pricing-card"
import { calculateFullQuotation } from "@/lib/quotation-calculator"
import { DEFAULT_CLIENT_DETAILS } from "@/lib/client-pax"
import { createDefaultStays } from "@/lib/quotation-utils"
import type {
  AccommodationDetails,
  ClientDetails,
  ItineraryStay,
  QuotationData,
  TransportSelection,
} from "@/lib/quotation-types"
import { ItineraryStaysCard } from "@/components/itinerary-stays-card"
import { useChainedStays } from "@/hooks/use-chained-stays"
import { Bus, FileText, AlertTriangle } from "lucide-react"

interface StaffDashboardProps {
  hotels: Hotel[]
  vehicleTypes: VehicleType[]
  transportRoutes: TransportRoute[]
  transportRates: TransportRate[]
  visaCategories: VisaCategory[]
  settings: GlobalSettings
  currentUser: User | null
  onSaveQuotation: (quotation: SavedQuotation) => void
}

const DEFAULT_TRANSPORT: TransportSelection = {
  selectedRoutes: ["full-1"],
  vehicleSelections: { "full-1": "hiace" },
  makkahZiyarat: false,
  madinahZiyarat: false,
}

export function StaffDashboard({
  hotels,
  vehicleTypes,
  transportRoutes,
  transportRates,
  visaCategories,
  settings,
  currentUser,
  onSaveQuotation,
}: StaffDashboardProps) {
  const [client, setClient] = useState<ClientDetails>(DEFAULT_CLIENT_DETAILS)
  const [stays, setStays] = useState<ItineraryStay[]>(() => createDefaultStays(hotels))
  const [transport, setTransport] = useState<TransportSelection>(DEFAULT_TRANSPORT)
  const [visaCategoryId, setVisaCategoryId] = useState(visaCategories[0]?.id || "")

  useChainedStays(stays, setStays)

  const accommodation: AccommodationDetails = useMemo(() => ({ stays }), [stays])

  const calculations = useMemo(
    () =>
      calculateFullQuotation({
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
      }),
    [
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
    ]
  )

  const quotationData: QuotationData = {
    client,
    accommodation,
    transport,
    visaCategoryId,
    calculations,
  }

  const handleRouteToggle = (routeId: string, checked: boolean) => {
    if (checked) {
      setTransport((prev) => ({
        ...prev,
        selectedRoutes: [...prev.selectedRoutes, routeId],
        vehicleSelections: { ...prev.vehicleSelections, [routeId]: "hiace" },
      }))
      return
    }

    setTransport((prev) => {
      const nextSelections = { ...prev.vehicleSelections }
      delete nextSelections[routeId]
      return {
        ...prev,
        selectedRoutes: prev.selectedRoutes.filter((id) => id !== routeId),
        vehicleSelections: nextSelections,
      }
    })
  }

  const handleVehicleChange = (routeId: string, vehicleId: string) => {
    setTransport((prev) => ({
      ...prev,
      vehicleSelections: { ...prev.vehicleSelections, [routeId]: vehicleId },
    }))
  }

  const mainRoutes = transportRoutes.filter((route) => !route.id.includes("ziyarat"))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <ClientDetailsCard client={client} onChange={setClient} />

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              Visa & Air Tickets
            </CardTitle>
            <CardDescription>Visa category and per-person ticket pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Visa Category</Label>
              <Select value={visaCategoryId} onValueChange={setVisaCategoryId}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select visa type" />
                </SelectTrigger>
                <SelectContent>
                  {visaCategories.map((visa) => (
                    <SelectItem key={visa.id} value={visa.id}>
                      {visa.name} - Adult/Child {visa.adultRateSar} SAR, Infant{" "}
                      {visa.infantRateSar} SAR
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-border" />

            <AirTicketPricingCard client={client} onChange={setClient} />
          </CardContent>
        </Card>

        <ItineraryStaysCard
          stays={stays}
          hotels={hotels}
          settings={settings}
          onChange={setStays}
        />

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bus className="w-5 h-5 text-primary" />
              Transport
            </CardTitle>
            <CardDescription>Select routes and vehicle types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {calculations.vehicleWarnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {calculations.vehicleWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {mainRoutes.map((route) => {
                const isSelected = transport.selectedRoutes.includes(route.id)
                const selectedVehicle = transport.vehicleSelections[route.id]

                return (
                  <div
                    key={route.id}
                    className="flex items-center gap-4 p-3 border border-border rounded-lg bg-secondary/20"
                  >
                    <Checkbox
                      id={route.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleRouteToggle(route.id, !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={route.id}
                        className="font-medium text-foreground cursor-pointer"
                      >
                        <span className="font-mono text-xs text-primary mr-2">{route.code}</span>
                        {route.name}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">{route.description}</p>
                    </div>
                    {isSelected && (
                      <Select
                        value={selectedVehicle}
                        onValueChange={(value) => handleVehicleChange(route.id, value)}
                      >
                        <SelectTrigger className="w-48 bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes
                            .filter((vehicle) => vehicle.id !== "sharing" || route.isSharing)
                            .map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.displayName}
                                {vehicle.id !== "sharing" && ` (Max ${vehicle.maxPax} pax)`}
                                {vehicle.id === "sharing" && " (Per Pax)"}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )
              })}
            </div>

            <Separator className="bg-border" />

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Ziyarat (Holy Sites Tours)</h4>

              <div className="flex items-center gap-4 p-3 border border-border rounded-lg bg-secondary/20">
                <Checkbox
                  id="mak-ziyarat"
                  checked={transport.makkahZiyarat}
                  onCheckedChange={(checked) =>
                    setTransport((prev) => ({
                      ...prev,
                      makkahZiyarat: !!checked,
                      vehicleSelections: {
                        ...prev.vehicleSelections,
                        "mak-ziyarat": "sharing",
                      },
                    }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="mak-ziyarat" className="font-medium text-foreground cursor-pointer">
                    Makkah Ziyarat
                  </Label>
                  <p className="text-xs text-muted-foreground">Holy sites tour in Makkah</p>
                </div>
                {transport.makkahZiyarat && (
                  <Select
                    value={transport.vehicleSelections["mak-ziyarat"] || "sharing"}
                    onValueChange={(value) => handleVehicleChange("mak-ziyarat", value)}
                  >
                    <SelectTrigger className="w-48 bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center gap-4 p-3 border border-border rounded-lg bg-secondary/20">
                <Checkbox
                  id="med-ziyarat"
                  checked={transport.madinahZiyarat}
                  onCheckedChange={(checked) =>
                    setTransport((prev) => ({
                      ...prev,
                      madinahZiyarat: !!checked,
                      vehicleSelections: {
                        ...prev.vehicleSelections,
                        "med-ziyarat": "sharing",
                      },
                    }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="med-ziyarat" className="font-medium text-foreground cursor-pointer">
                    Madinah Ziyarat
                  </Label>
                  <p className="text-xs text-muted-foreground">Holy sites tour in Madinah</p>
                </div>
                {transport.madinahZiyarat && (
                  <Select
                    value={transport.vehicleSelections["med-ziyarat"] || "sharing"}
                    onValueChange={(value) => handleVehicleChange("med-ziyarat", value)}
                  >
                    <SelectTrigger className="w-48 bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <QuotationSummary
          quotation={quotationData}
          hotels={hotels}
          vehicleTypes={vehicleTypes}
          transportRoutes={transportRoutes}
          visaCategories={visaCategories}
          settings={settings}
          currentUser={currentUser}
          onSaveQuotation={onSaveQuotation}
        />
      </div>
    </div>
  )
}
