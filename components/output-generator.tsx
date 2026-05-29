"use client"

import type { Hotel, VehicleType, TransportRoute, VisaCategory, GlobalSettings } from "@/app/page"
import type { QuotationData } from "@/lib/quotation-types"
import {
  CITY_LABELS,
  isHotelMealPlanEnabled,
  isHotelViewTypeEnabled,
  MEAL_PLAN_LABELS,
  ROOM_TYPE_LABELS,
  VIEW_LABELS,
  getResolvedMealPlan,
  getResolvedViewType,
} from "@/lib/quotation-utils"
import { Plane } from "lucide-react"

/** Printable PDF layout for staff quotations. */
export function PdfPreview({
  quotation,
  hotels,
  visaCategories,
  vehicleTypes,
  transportRoutes,
  settings,
}: {
  quotation: QuotationData
  hotels: Hotel[]
  visaCategories: VisaCategory[]
  vehicleTypes: VehicleType[]
  transportRoutes: TransportRoute[]
  settings: GlobalSettings
}) {
  const { client, accommodation, transport, calculations, visaCategoryId } = quotation
  const selectedVisa = visaCategories.find((visa) => visa.id === visaCategoryId)

  return (
    <div className="bg-background text-foreground p-8 rounded-lg border border-border print:border-0 print:p-0">
      <div className="flex items-center justify-between border-b border-border pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Skyship Travels</h1>
            <p className="text-muted-foreground">Your Journey, Our Passion</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Quotation Date</p>
          <p className="font-semibold">
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-xl font-bold uppercase tracking-wide">Umrah Package Proposal</h2>
        <p className="text-muted-foreground">Prepared for: {client.name || "Valued Customer"}</p>
        {client.mobile && <p className="text-sm text-muted-foreground">Mobile: {client.mobile}</p>}
        {client.email && <p className="text-sm text-muted-foreground">Email: {client.email}</p>}
      </div>

      <div className="mb-6 p-4 bg-secondary/30 rounded-lg">
        <h3 className="font-semibold mb-3">Traveler Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Adults</p>
            <p className="font-semibold">{client.adults}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Children (bed)</p>
            <p className="font-semibold">{client.childrenWithBed}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Children (no bed)</p>
            <p className="font-semibold">{client.childrenWithoutBed}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Infants</p>
            <p className="font-semibold">{client.infants}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-semibold text-primary">{calculations.totalPax}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 border border-border rounded-lg">
        <h3 className="font-semibold mb-2">Visa</h3>
        <p className="text-sm text-muted-foreground">{selectedVisa?.name || "N/A"}</p>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-3">Accommodation Itinerary</h3>
        <div className="space-y-3">
          {accommodation.stays.map((stay, index) => {
            const hotel = hotels.find((item) => item.id === stay.hotelId)
            const mealPlan = isHotelMealPlanEnabled(hotel, settings)
              ? MEAL_PLAN_LABELS[getResolvedMealPlan(hotel, settings, stay.mealPlan)]
              : null
            const viewType = isHotelViewTypeEnabled(hotel, settings)
              ? VIEW_LABELS[getResolvedViewType(hotel, settings, stay.viewType)]
              : null
            return (
              <div key={stay.id} className="p-4 border border-border rounded-lg text-sm">
                <h4 className="font-medium text-primary mb-2">
                  Stay {index + 1}: {CITY_LABELS[stay.city]}
                </h4>
                <p>
                  <span className="text-muted-foreground">Hotel:</span> {hotel?.name || "N/A"}
                </p>
                <p>
                  <span className="text-muted-foreground">Nights:</span> {stay.nights}
                </p>
                <p>
                  <span className="text-muted-foreground">Room:</span>{" "}
                  {ROOM_TYPE_LABELS[stay.roomType]}
                </p>
                {mealPlan && (
                  <p>
                    <span className="text-muted-foreground">Meal:</span> {mealPlan}
                  </p>
                )}
                {viewType && (
                  <p>
                    <span className="text-muted-foreground">View:</span> {viewType}
                  </p>
                )}
                {stay.checkIn && (
                  <p>
                    <span className="text-muted-foreground">Check-in:</span>{" "}
                    {new Date(stay.checkIn).toLocaleDateString("en-GB")}
                  </p>
                )}
                {index < accommodation.stays.length - 1 && stay.transitBreakNights > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Transit: {stay.transitBreakNights} night(s)
                    {stay.transitBreakLocation ? ` in ${stay.transitBreakLocation}` : ""}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-6 p-4 border border-border rounded-lg">
        <h3 className="font-semibold mb-3">Transport</h3>
        <div className="space-y-2 text-sm">
          {transport.selectedRoutes.map((routeId) => {
            const route = transportRoutes.find((item) => item.id === routeId)
            const vehicle = vehicleTypes.find(
              (item) => item.id === transport.vehicleSelections[routeId]
            )
            return (
              <div key={routeId} className="flex justify-between">
                <span className="text-muted-foreground">{route?.name}</span>
                <span>{vehicle?.displayName}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-3">Package Pricing (PKR)</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span>Visa Fee</span>
            <span>{calculations.visaCost.pkr.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span>Air Tickets</span>
            <span>{calculations.ticketCost.pkr.toLocaleString()}</span>
          </div>
          {calculations.stayCosts.map((stay) => (
            <div key={stay.stayId} className="flex justify-between py-2 border-b border-border">
              <span>
                {CITY_LABELS[stay.city]} ({stay.nights} nights)
              </span>
              <span>{stay.pkr.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 border-b border-border">
            <span>Transport</span>
            <span>
              {calculations.transportCosts.reduce((sum, item) => sum + item.pkr, 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span>Ground Handling</span>
            <span>{calculations.groundHandlingCost.pkr.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-primary/10 p-6 rounded-lg text-center mb-6">
        <p className="text-sm text-muted-foreground mb-1">Grand Total</p>
        <p className="text-3xl font-bold text-primary">
          {calculations.grandTotal.pkr.toLocaleString()} PKR
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {calculations.perPerson.pkr.toLocaleString()} PKR per person
        </p>
      </div>

      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>Exchange rate: 1 SAR = {settings.currencyRate} PKR</p>
      </div>
    </div>
  )
}
