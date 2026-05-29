"use client"

import { useState } from "react"
import type { Hotel, VehicleType, TransportRoute, VisaCategory, GlobalSettings, SavedQuotation, User } from "@/app/page"
import { generateQuotationNumber } from "@/app/page"
import type { QuotationData } from "@/lib/quotation-types"
import {
  CITY_LABELS,
  generateWhatsAppMessage,
  isHotelMealPlanEnabled,
  isHotelViewTypeEnabled,
  MEAL_PLAN_LABELS,
  ROOM_TYPE_LABELS,
  VIEW_LABELS,
  getResolvedMealPlan,
  getResolvedViewType,
} from "@/lib/quotation-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PdfPreview } from "@/components/output-generator"
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Mail,
  FileText,
  Link2,
  Save,
} from "lucide-react"
import { toast } from "sonner"

interface QuotationSummaryProps {
  quotation: QuotationData
  hotels: Hotel[]
  vehicleTypes: VehicleType[]
  transportRoutes: TransportRoute[]
  visaCategories: VisaCategory[]
  settings: GlobalSettings
  currentUser: User | null
  onSaveQuotation: (quotation: SavedQuotation) => void
}

export function QuotationSummary({
  quotation,
  hotels,
  vehicleTypes,
  transportRoutes,
  visaCategories,
  settings,
  currentUser,
  onSaveQuotation,
}: QuotationSummaryProps) {
  const [showPdf, setShowPdf] = useState(false)
  const { calculations, accommodation, transport, visaCategoryId, client } = quotation
  const selectedVisa = visaCategories.find((visa) => visa.id === visaCategoryId)

  const whatsappMessage = generateWhatsAppMessage(
    quotation,
    hotels,
    vehicleTypes,
    transportRoutes,
    visaCategories,
    settings
  )

  const saveToLedger = (status: "draft" | "confirmed") => {
    if (!currentUser) {
      toast.error("You must be logged in to save a quotation.")
      return
    }
    onSaveQuotation({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      quotationNo: generateQuotationNumber(),
      clientName: client.name.trim() || "Unnamed Client",
      clientEmail: client.email,
      agentId: currentUser.id,
      agentName: currentUser.name,
      agentCategory: currentUser.agentCategory,
      totalPricePkr: calculations.grandTotal.pkr,
      status,
      createdAt: new Date().toISOString(),
      quotationData: quotation,
    })
    toast.success(status === "confirmed" ? "Quotation confirmed." : "Quotation saved as draft.")
  }

  const sendWhatsApp = () => {
    const digits = client.mobile.replace(/\D/g, "")
    if (digits) {
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage)}`, "_blank")
    } else {
      navigator.clipboard.writeText(whatsappMessage)
      toast.success("Quotation copied. Add a mobile number to open WhatsApp directly.")
    }
  }

  const sendEmail = () => {
    if (!client.email.trim()) {
      toast.error("Please enter client email in Client Details.")
      return
    }
    const subject = encodeURIComponent(`Umrah Quotation - ${client.name || "Skyship Travels"}`)
    const body = encodeURIComponent(whatsappMessage)
    window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`
  }

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Page link copied to clipboard.")
    } catch {
      toast.error("Could not copy link.")
    }
  }

  return (
    <>
      <Card className="bg-card border-border sticky top-24">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calculator className="w-5 h-5 text-primary" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {calculations.vehicleWarnings.length > 0 && (
            <div className="p-2 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Vehicle Capacity Warning</span>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Travelers</span>
              <span className="text-foreground font-medium">{calculations.totalPax} persons</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Visa</span>
              <span className="text-foreground">{selectedVisa?.name || "—"}</span>
            </div>

            {accommodation.stays.map((stay, index) => {
              const hotel = hotels.find((item) => item.id === stay.hotelId)
              const stayCost = calculations.stayCosts.find((item) => item.stayId === stay.id)
              const mealPlan = isHotelMealPlanEnabled(hotel, settings)
                ? MEAL_PLAN_LABELS[getResolvedMealPlan(hotel, settings, stay.mealPlan)]
                : null
              const viewType = isHotelViewTypeEnabled(hotel, settings)
                ? VIEW_LABELS[getResolvedViewType(hotel, settings, stay.viewType)]
                : null
              return (
                <div key={stay.id} className="pt-2 border-t border-border/60">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {CITY_LABELS[stay.city]} ({stay.nights}N)
                    </span>
                    <span className="text-foreground text-right">{hotel?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pl-1 mt-1">
                    <span>{ROOM_TYPE_LABELS[stay.roomType]}</span>
                    <span>
                      {[mealPlan, viewType].filter(Boolean).join(" · ") || "Standard rate"}
                    </span>
                  </div>
                  {stayCost && stayCost.weekendNights > 0 && (
                    <p className="text-xs text-accent pl-1">
                      {stayCost.weekendNights} weekend night(s) in stay {index + 1}
                    </p>
                  )}
                </div>
              )
            })}

            <div className="pt-2 border-t border-border/60">
              <span className="text-muted-foreground text-xs">Transport</span>
              <div className="space-y-1 mt-1">
                {transport.selectedRoutes.map((routeId) => {
                  const route = transportRoutes.find((item) => item.id === routeId)
                  const vehicle = vehicleTypes.find(
                    (item) => item.id === transport.vehicleSelections[routeId]
                  )
                  return (
                    <div key={routeId} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{route?.code}</span>
                      <Badge variant="outline" className="text-xs h-5">
                        {vehicle?.displayName}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Visa Fee</span>
              <span className="text-foreground">{calculations.visaCost.pkr.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                Air Tickets (
                {calculations.ticketCost.adultPax}{" "}
                {calculations.ticketCost.adultPax === 1 ? "adult" : "adults"},{" "}
                {calculations.ticketCost.childPax}{" "}
                {calculations.ticketCost.childPax === 1 ? "child" : "children"},{" "}
                {calculations.ticketCost.infantPax}{" "}
                {calculations.ticketCost.infantPax === 1 ? "infant" : "infants"})
              </span>
              <span className="text-foreground">{calculations.ticketCost.pkr.toLocaleString()}</span>
            </div>
            {calculations.stayCosts.map((stay) => (
              <div key={stay.stayId} className="flex justify-between text-muted-foreground">
                <span>
                  {CITY_LABELS[stay.city]} Hotel ({stay.nights}N)
                </span>
                <span className="text-foreground">{stay.pkr.toLocaleString()}</span>
              </div>
            ))}
            {calculations.transportCosts.map((tc) => {
              const route = transportRoutes.find((item) => item.id === tc.routeId)
              return (
                <div key={tc.routeId} className="flex justify-between text-muted-foreground">
                  <span>Transport ({route?.code})</span>
                  <span className="text-foreground">{tc.pkr.toLocaleString()}</span>
                </div>
              )
            })}
            {calculations.ziyaratCosts.pkr > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Ziyarat Tours</span>
                <span className="text-foreground">{calculations.ziyaratCosts.pkr.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Ground Handling</span>
              <span className="text-foreground">
                {calculations.groundHandlingCost.pkr.toLocaleString()}
              </span>
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{calculations.subtotal.pkr.toLocaleString()} PKR</span>
            </div>
            {!settings.hideRatesFromStaff && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Agency Margin
                </span>
                <span className="text-accent">{calculations.profit.pkr.toLocaleString()} PKR</span>
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Grand Total</span>
              <span className="text-2xl font-bold text-primary">
                {calculations.grandTotal.pkr.toLocaleString()} PKR
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Per Person</span>
              <span className="text-foreground font-medium">
                {calculations.perPerson.pkr.toLocaleString()} PKR
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Exchange Rate: 1 SAR = {settings.currencyRate} PKR
          </p>

          <Separator className="bg-border" />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border"
              onClick={sendWhatsApp}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Send to WhatsApp
            </Button>
            <Button type="button" variant="outline" className="border-border" onClick={sendEmail}>
              <Mail className="w-4 h-4 mr-1" />
              Send to Email
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-border"
              onClick={() => {
                setShowPdf(true)
                setTimeout(() => window.print(), 400)
              }}
            >
              <FileText className="w-4 h-4 mr-1" />
              Save as PDF
            </Button>
            <Button type="button" variant="outline" className="border-border" onClick={shareLink}>
              <Link2 className="w-4 h-4 mr-1" />
              Share Link
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => saveToLedger("draft")}>
              <Save className="w-4 h-4 mr-1" />
              Save Draft
            </Button>
            <Button type="button" onClick={() => saveToLedger("confirmed")}>
              Confirm Quotation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPdf} onOpenChange={setShowPdf}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">PDF Preview</DialogTitle>
          </DialogHeader>
          <PdfPreview
            quotation={quotation}
            hotels={hotels}
            visaCategories={visaCategories}
            vehicleTypes={vehicleTypes}
            transportRoutes={transportRoutes}
            settings={settings}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
