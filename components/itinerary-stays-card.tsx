"use client"

import type { GlobalSettings, Hotel, MealPlan, RoomType, ViewType } from "@/app/page"
import type { ItineraryStay, StayCity } from "@/lib/quotation-types"
import {
  CITY_LABELS,
  isHotelMealPlanEnabled,
  isHotelViewTypeEnabled,
  ROOM_TYPE_LABELS,
} from "@/lib/quotation-utils"
import { getActiveRoomTypesFromRates } from "@/lib/hotel-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Hotel as HotelIcon, Calendar, Coffee, MapPin, Plus, Trash2, ArrowRight } from "lucide-react"

interface ItineraryStaysCardProps {
  stays: ItineraryStay[]
  hotels: Hotel[]
  settings: GlobalSettings
  onChange: (stays: ItineraryStay[]) => void
}

export function ItineraryStaysCard({ stays, hotels, settings, onChange }: ItineraryStaysCardProps) {
  const updateStay = (stayId: string, patch: Partial<ItineraryStay>) => {
    onChange(
      stays.map((stay) => {
        if (stay.id !== stayId) return stay
        const next = { ...stay, ...patch }
        if (patch.city) {
          const firstHotel = hotels.find((hotel) => hotel.city === patch.city)
          next.hotelId = firstHotel?.id ?? ""
        }
        if (patch.hotelId) {
          const hotel = hotels.find((item) => item.id === patch.hotelId)
          const activeRooms = hotel ? getActiveRoomTypesFromRates(hotel.rates) : []
          if (activeRooms.length > 0 && !activeRooms.includes(next.roomType)) {
            next.roomType = activeRooms[0]
          }
        }
        return next
      })
    )
  }

  const addStay = () => {
    const city: StayCity = "makkah"
    const defaultHotel = hotels.find((hotel) => hotel.city === city)
    onChange([
      ...stays,
      {
        id: `stay-${Date.now()}`,
        city,
        hotelId: defaultHotel?.id ?? "",
        nights: 3,
        checkIn: "",
        roomType: "quad",
        mealPlan: "ro",
        viewType: "city",
        transitBreakNights: 0,
        transitBreakLocation: "",
      },
    ])
  }

  const removeStay = (stayId: string) => {
    if (stays.length <= 1) return
    onChange(stays.filter((stay) => stay.id !== stayId))
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <HotelIcon className="w-5 h-5 text-primary" />
              Accommodation Itinerary
            </CardTitle>
            <CardDescription>
              Add each city stay with hotel, nights, check-in, and room type
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addStay}>
            <Plus className="w-4 h-4 mr-1" />
            Add Destination
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {stays.map((stay, index) => {
          const cityHotels = hotels.filter((hotel) => hotel.city === stay.city)
          const selectedHotel = hotels.find((hotel) => hotel.id === stay.hotelId)
          const roomTypes = selectedHotel
            ? getActiveRoomTypesFromRates(selectedHotel.rates)
            : []
          const showMealPlan = isHotelMealPlanEnabled(selectedHotel, settings)
          const showViewType = isHotelViewTypeEnabled(selectedHotel, settings)
          const isAutoCheckIn = index > 0 && !!stays[index - 1]?.checkIn

          return (
            <div key={stay.id} className="border border-border rounded-lg p-4 space-y-4 bg-secondary/10">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">
                  Stay {index + 1}: {CITY_LABELS[stay.city]}
                </h4>
                {stays.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeStay(stay.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={stay.city}
                    onValueChange={(value) => updateStay(stay.id, { city: value as StayCity })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="makkah">Makkah</SelectItem>
                      <SelectItem value="madinah">Madinah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Hotel</Label>
                  <Select
                    value={stay.hotelId}
                    onValueChange={(value) => updateStay(stay.id, { hotelId: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select hotel" />
                    </SelectTrigger>
                    <SelectContent>
                      {cityHotels.map((hotel) => (
                        <SelectItem key={hotel.id} value={hotel.id}>
                          {hotel.name} ({hotel.tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select
                    value={stay.roomType}
                    onValueChange={(value) =>
                      updateStay(stay.id, { roomType: value as RoomType })
                    }
                    disabled={roomTypes.length === 0}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((roomType) => (
                        <SelectItem key={roomType} value={roomType}>
                          {ROOM_TYPE_LABELS[roomType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nights</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stay.nights}
                    onChange={(e) =>
                      updateStay(stay.id, { nights: parseInt(e.target.value, 10) || 1 })
                    }
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Check-in
                  </Label>
                  <Input
                    type="date"
                    value={stay.checkIn}
                    onChange={(e) => updateStay(stay.id, { checkIn: e.target.value })}
                    readOnly={isAutoCheckIn}
                    className="bg-input border-border"
                  />
                  {isAutoCheckIn && (
                    <p className="text-xs text-muted-foreground">Auto from previous stay</p>
                  )}
                </div>
              </div>

              {(showMealPlan || showViewType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showMealPlan && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Coffee className="w-3 h-3" />
                        Meal Plan
                      </Label>
                      <Select
                        value={stay.mealPlan}
                        onValueChange={(value) =>
                          updateStay(stay.id, { mealPlan: value as MealPlan })
                        }
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ro">Room Only (RO)</SelectItem>
                          <SelectItem value="bb">Bed & Breakfast (BB)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {showViewType && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        View Type
                      </Label>
                      <Select
                        value={stay.viewType}
                        onValueChange={(value) =>
                          updateStay(stay.id, { viewType: value as ViewType })
                        }
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="city">City View</SelectItem>
                          <SelectItem value="haram">Haram/Kaaba View</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {index < stays.length - 1 && (
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex flex-wrap items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Transit before next stay</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Nights"
                      value={stay.transitBreakNights || ""}
                      onChange={(e) =>
                        updateStay(stay.id, {
                          transitBreakNights: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-20 bg-input border-border text-sm"
                    />
                    <Input
                      placeholder="Location (e.g., Jeddah)"
                      value={stay.transitBreakLocation}
                      onChange={(e) =>
                        updateStay(stay.id, { transitBreakLocation: e.target.value })
                      }
                      className="w-40 bg-input border-border text-sm"
                    />
                  </div>
                </div>
              )}

              {index < stays.length - 1 && <Separator className="bg-border" />}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
