"use client"

import { useState, useEffect } from "react"
import type { 
  Hotel, 
  VehicleType, 
  TransportRoute, 
  TransportRate, 
  VisaCategory, 
  HotelSeason,
  GlobalSettings,
  RoomType,
  MealPlan,
  ViewType,
  User,
} from "@/app/page"
import {
  BASE_SEASON_NAME,
  PRICING_INPUT_CLASS,
  formatAuditLabel,
  formatRoomRateDisplay,
  finalizeHotelForSave,
  getHotelInlineValidation,
  getTransportInlineValidation,
  getVisaInlineValidation,
  REQUIRED_ROOM_TYPES,
  sanitizeNonNegative,
  validateHotelPayload,
} from "@/lib/hotel-utils"
import { createDefaultSeasonRates, createHotelRates } from "@/lib/hotel-rates"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  DollarSign, 
  Building2, 
  Bus, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  FileText,
  Eye,
  EyeOff,
  Shield
} from "lucide-react"

interface AdminDashboardProps {
  hotels: Hotel[]
  setHotels: (hotels: Hotel[]) => void
  vehicleTypes: VehicleType[]
  setVehicleTypes: (vehicles: VehicleType[]) => void
  transportRoutes: TransportRoute[]
  setTransportRoutes: (routes: TransportRoute[]) => void
  transportRates: TransportRate[]
  setTransportRates: (rates: TransportRate[]) => void
  visaCategories: VisaCategory[]
  setVisaCategories: (categories: VisaCategory[]) => void
  settings: GlobalSettings
  setSettings: (settings: GlobalSettings) => void
  currentUser: User | null
}

export function AdminDashboard({
  hotels,
  setHotels,
  vehicleTypes,
  setVehicleTypes,
  transportRoutes,
  setTransportRoutes,
  transportRates,
  setTransportRates,
  visaCategories,
  setVisaCategories,
  settings,
  setSettings,
  currentUser,
}: AdminDashboardProps) {
  const createDefaultSeason = (): HotelSeason => createDefaultSeasonRates(400)

  const [editingHotel, setEditingHotel] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string>(transportRoutes[0]?.id || "")
  const [showAddRouteForm, setShowAddRouteForm] = useState(false)
  const [newRouteData, setNewRouteData] = useState({
    code: "",
    name: "",
    description: "",
    isSharing: false,
  })
  const [showAddHotel, setShowAddHotel] = useState(false)
  const [showAdvancedAddHotel, setShowAdvancedAddHotel] = useState(false)
  const [addHotelErrors, setAddHotelErrors] = useState<string[]>([])
  const [newHotelData, setNewHotelData] = useState({
    name: "",
    city: "makkah" as "makkah" | "madinah",
    tier: "standard" as "economy" | "standard" | "luxury",
    distanceKm: 0,
    rates: createHotelRates(400),
    seasons: [createDefaultSeason()] as HotelSeason[],
  })

  const handleSettingChange = (key: keyof GlobalSettings, value: number | string | boolean) => {
    setSettings({ ...settings, [key]: value })
  }

  const upsertTransportRate = (routeId: string, vehicleId: string, rateSar: number) => {
    const safeRate = sanitizeNonNegative(rateSar)
    const existing = transportRates.find(
      (rate) => rate.routeId === routeId && rate.vehicleId === vehicleId
    )
    if (existing) {
      setTransportRates(
        transportRates.map((rate) =>
          rate.routeId === routeId && rate.vehicleId === vehicleId
            ? { ...rate, rateSar: safeRate }
            : rate
        )
      )
      return
    }
    setTransportRates([
      ...transportRates,
      { id: `${routeId}-${vehicleId}`, routeId, vehicleId, rateSar: safeRate },
    ])
  }

  const handleTransportRateChange = (routeId: string, vehicleId: string, newRate: number) => {
    upsertTransportRate(routeId, vehicleId, newRate)
  }

  const handleVehicleTypeChange = (
    vehicleId: string,
    patch: Partial<Pick<VehicleType, "displayName" | "maxPax">>
  ) => {
    // Sharing bus uses per-pax pricing only; capacity fields are not editable.
    if (vehicleId === "sharing") {
      if (patch.displayName === undefined) return
      const displayName = patch.displayName.trim()
      if (!displayName) return
      setVehicleTypes(
        vehicleTypes.map((vehicle) =>
          vehicle.id === vehicleId ? { ...vehicle, displayName } : vehicle
        )
      )
      return
    }

    setVehicleTypes(
      vehicleTypes.map((vehicle) => {
        if (vehicle.id !== vehicleId) return vehicle
        const maxPax =
          patch.maxPax !== undefined ? sanitizeNonNegative(patch.maxPax) : vehicle.maxPax
        return {
          ...vehicle,
          ...patch,
          minPax: 1,
          maxPax: Math.max(1, maxPax),
        }
      })
    )
  }

  const handleAddVehicleType = () => {
    const newId = `vehicle-${Date.now()}`
    const newVehicle: VehicleType = {
      id: newId,
      name: newId,
      displayName: "New Vehicle",
      minPax: 1,
      maxPax: 4,
    }
    setVehicleTypes([...vehicleTypes, newVehicle])
    setTransportRates([
      ...transportRates,
      ...transportRoutes.map((route) => ({
        id: `${route.id}-${newId}`,
        routeId: route.id,
        vehicleId: newId,
        rateSar: 0,
      })),
    ])
  }

  const handleAddTransportRoute = () => {
    const code = newRouteData.code.trim().toUpperCase()
    const name = newRouteData.name.trim()
    if (!code || !name) return

    let routeId = code.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    if (transportRoutes.some((route) => route.id === routeId)) {
      routeId = `${routeId}-${Date.now()}`
    }
    const nextSortOrder =
      transportRoutes.reduce((max, route) => Math.max(max, route.sortOrder), 0) + 1
    const newRoute: TransportRoute = {
      id: routeId,
      code,
      name,
      description: newRouteData.description.trim() || name,
      isSharing: newRouteData.isSharing,
      sortOrder: nextSortOrder,
    }

    setTransportRoutes([...transportRoutes, newRoute])
    setTransportRates([
      ...transportRates,
      ...vehicleTypes.map((vehicle) => ({
        id: `${routeId}-${vehicle.id}`,
        routeId,
        vehicleId: vehicle.id,
        rateSar: 0,
      })),
    ])
    setSelectedRoute(routeId)
    setNewRouteData({ code: "", name: "", description: "", isSharing: false })
    setShowAddRouteForm(false)
  }

  const handleDeleteTransportRoute = () => {
    const routeIdToDelete = selectedRoute
    if (!routeIdToDelete || transportRoutes.length <= 1) return

    const remainingRoutes = transportRoutes.filter((route) => route.id !== routeIdToDelete)
    if (remainingRoutes.length === transportRoutes.length) return

    setTransportRoutes(remainingRoutes)
    setTransportRates(
      transportRates.filter((rate) => rate.routeId !== routeIdToDelete)
    )
    setSelectedRoute(remainingRoutes[0]?.id ?? "")
  }

  // Keep route selector in sync when routes are deleted or replaced from parent state.
  useEffect(() => {
    if (transportRoutes.length === 0) {
      if (selectedRoute) setSelectedRoute("")
      return
    }
    if (!transportRoutes.some((route) => route.id === selectedRoute)) {
      setSelectedRoute(transportRoutes[0].id)
    }
  }, [transportRoutes, selectedRoute])

  const handleVisaAdultChildRateChange = (id: string, newRate: number) => {
    const safeRate = sanitizeNonNegative(newRate)
    setVisaCategories(
      visaCategories.map((visa) =>
        visa.id === id ? { ...visa, adultRateSar: safeRate, childRateSar: safeRate } : visa
      )
    )
  }

  const handleVisaInfantRateChange = (id: string, newRate: number) => {
    setVisaCategories(
      visaCategories.map((visa) =>
        visa.id === id ? { ...visa, infantRateSar: sanitizeNonNegative(newRate) } : visa
      )
    )
  }

  const handleVisaFeeChange = (
    id: string,
    field: "processingFeeSar" | "serviceChargeSar",
    newValue: number
  ) => {
    setVisaCategories(
      visaCategories.map((visa) =>
        visa.id === id ? { ...visa, [field]: sanitizeNonNegative(newValue) } : visa
      )
    )
  }

  const handleDeleteHotel = (id: string) => {
    setHotels(hotels.filter((h) => h.id !== id))
  }

  const handleAddHotel = () => {
    const errors = validateHotelPayload(
      { name: newHotelData.name, seasons: newHotelData.seasons },
      hotels
    )

    if (errors.length > 0) {
      setAddHotelErrors(errors)
      return
    }

    const draftHotel: Hotel = {
      id: Date.now().toString(),
      name: newHotelData.name,
      city: newHotelData.city,
      tier: newHotelData.tier,
      distanceKm: newHotelData.distanceKm,
      rates: newHotelData.seasons[0]?.rates || newHotelData.rates,
      seasons: newHotelData.seasons,
    }

    const newHotel = finalizeHotelForSave(draftHotel, currentUser?.name || "Admin")
    setHotels([...hotels, newHotel])
    setNewHotelData({
      name: "",
      city: "makkah",
      tier: "standard",
      distanceKm: 0,
      rates: createHotelRates(400),
      seasons: [createDefaultSeason()],
    })
    setAddHotelErrors([])
    setShowAdvancedAddHotel(false)
    setShowAddHotel(false)
  }

  const handleDefaultSeasonRateChange = (
    roomType: RoomType,
    mealPlan: MealPlan,
    viewType: ViewType,
    dayType: "weekday" | "weekend",
    value: number
  ) => {
    const defaultSeason = newHotelData.seasons[0]
    if (!defaultSeason) return
    updateNewHotelSeasonRate(
      defaultSeason.id,
      roomType,
      mealPlan,
      viewType,
      dayType,
      sanitizeNonNegative(value)
    )
  }

  const handleAddHotelNameChange = (name: string) => {
    setNewHotelData({ ...newHotelData, name })
    if (addHotelErrors.length > 0) {
      setAddHotelErrors([])
    }
  }

  const addNewHotelSeason = () => {
    setNewHotelData({
      ...newHotelData,
      seasons: [
        ...newHotelData.seasons,
        {
          id: Date.now().toString(),
          name: "",
          startDate: "",
          endDate: "",
          rates: createHotelRates(400),
        },
      ],
    })
  }

  const updateNewHotelSeason = (seasonId: string, patch: Partial<HotelSeason>) => {
    setNewHotelData({
      ...newHotelData,
      seasons: newHotelData.seasons.map((season) =>
        season.id === seasonId ? { ...season, ...patch } : season
      ),
    })
  }

  const updateNewHotelSeasonRate = (
    seasonId: string,
    roomType: RoomType,
    mealPlan: MealPlan,
    viewType: ViewType,
    dayType: "weekday" | "weekend",
    value: number
  ) => {
    const safeValue = sanitizeNonNegative(value)
    setNewHotelData({
      ...newHotelData,
      seasons: newHotelData.seasons.map((season) =>
        season.id === seasonId
          ? {
              ...season,
              rates: {
                ...season.rates,
                [roomType]: {
                  ...season.rates[roomType],
                  [mealPlan]: {
                    ...season.rates[roomType][mealPlan],
                    [viewType]: {
                      ...season.rates[roomType][mealPlan][viewType],
                      [dayType]: safeValue,
                    },
                  },
                },
              },
            }
          : season
      ),
    })
  }

  const removeNewHotelSeason = (seasonId: string) => {
    if (newHotelData.seasons[0]?.id === seasonId) return
    setNewHotelData({
      ...newHotelData,
      seasons: newHotelData.seasons.filter((season) => season.id !== seasonId),
    })
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "economy": return "bg-accent/20 text-accent"
      case "standard": return "bg-primary/20 text-primary"
      case "luxury": return "bg-chart-4/20 text-chart-4"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const selectedRouteData = transportRoutes.find((r) => r.id === selectedRoute)
  const routeRates = transportRates.filter((r) => r.routeId === selectedRoute)
  const visibleTransportVehicles = vehicleTypes.filter((vehicleType) => {
    if (vehicleType.id === "sharing") return !!selectedRouteData?.isSharing
    return true
  })
  const transportInlineValidation = getTransportInlineValidation(
    selectedRoute,
    transportRates,
    visibleTransportVehicles,
    !!selectedRouteData?.isSharing
  )
  const visaInlineValidation = getVisaInlineValidation(visaCategories)
  const addInlineValidation = getHotelInlineValidation(
    { name: newHotelData.name, seasons: newHotelData.seasons },
    hotels
  )

  const getAddSeasonError = (seasonId: string) =>
    addInlineValidation.seasons[seasonId] || { requiredRates: {} }

  const getFieldErrorClass = (hasError: boolean) =>
    hasError ? "border-destructive focus-visible:ring-destructive" : ""

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <DollarSign className="w-5 h-5 text-primary" />
            Global Settings
          </CardTitle>
          <CardDescription>Configure currency rates, fees, and system controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="currencyRate">Currency Rate (SAR to PKR)</Label>
              <Input
                id="currencyRate"
                type="number"
                step="0.01"
                value={settings.currencyRate}
                onChange={(e) => handleSettingChange("currencyRate", parseFloat(e.target.value) || 0)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groundHandling">Ground Handling Fee (SAR/pax)</Label>
              <Input
                id="groundHandling"
                type="number"
                value={settings.groundHandlingFee}
                onChange={(e) => handleSettingChange("groundHandlingFee", parseFloat(e.target.value) || 0)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profitType">Profit Type</Label>
              <Select
                value={settings.profitType}
                onValueChange={(value) => handleSettingChange("profitType", value)}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount (PKR)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profitMargin">
                Profit Margin {settings.profitType === "fixed" ? "(PKR)" : "(%)"}
              </Label>
              <Input
                id="profitMargin"
                type="number"
                value={settings.profitMargin}
                onChange={(e) => handleSettingChange("profitMargin", parseFloat(e.target.value) || 0)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Staff Privacy Mode
              </Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={settings.hideRatesFromStaff}
                  onCheckedChange={(checked) => handleSettingChange("hideRatesFromStaff", checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {settings.hideRatesFromStaff ? (
                    <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Hidden</span>
                  ) : (
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Visible</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="hotels" className="w-full">
        <TabsList className="bg-secondary flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="hotels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4 mr-2" />
            Hotels
          </TabsTrigger>
          <TabsTrigger value="transport" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bus className="w-4 h-4 mr-2" />
            Transport
          </TabsTrigger>
          <TabsTrigger value="visa" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Visa
          </TabsTrigger>
        </TabsList>

        {/* Hotels Tab */}
        <TabsContent value="hotels" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Hotel Master List</CardTitle>
                <CardDescription>
                  Manage hotels with Room Type, Meal Plan, View, and Weekday/Weekend pricing (SAR/night)
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowAddHotel(!showAddHotel)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Hotel
              </Button>
            </CardHeader>
            <CardContent>
              {showAddHotel && (
                <div className="mb-4 p-4 border border-border rounded-lg bg-secondary/50">
                  {addHotelErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {addHotelErrors.map((error, idx) => (
                            <li key={`${error}-${idx}`}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-hotel-name">Hotel Name</Label>
                        <Input
                          id="new-hotel-name"
                          value={newHotelData.name}
                          onChange={(e) => handleAddHotelNameChange(e.target.value)}
                          className={`bg-input ${getFieldErrorClass(!!addInlineValidation.hotelName)}`}
                        />
                        {addInlineValidation.hotelName && (
                          <p className="text-xs text-destructive">{addInlineValidation.hotelName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-hotel-city">City</Label>
                        <Select
                          value={newHotelData.city}
                          onValueChange={(value) => setNewHotelData({ ...newHotelData, city: value as "makkah" | "madinah" })}
                        >
                          <SelectTrigger id="new-hotel-city" className="bg-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="makkah">Makkah</SelectItem>
                            <SelectItem value="madinah">Madinah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-hotel-tier">Tier</Label>
                        <Select
                          value={newHotelData.tier}
                          onValueChange={(value) => setNewHotelData({ ...newHotelData, tier: value as "economy" | "standard" | "luxury" })}
                        >
                          <SelectTrigger id="new-hotel-tier" className="bg-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="economy">Economy</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="luxury">Luxury</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-hotel-distance">Distance</Label>
                        <Input
                          id="new-hotel-distance"
                          type="number"
                          value={newHotelData.distanceKm}
                          onChange={(e) => setNewHotelData({ ...newHotelData, distanceKm: sanitizeNonNegative(parseFloat(e.target.value) || 0) })}
                          onFocus={(e) => e.target.select()}
                          className="bg-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-season-name">Season Name</Label>
                        <Input
                          id="default-season-name"
                          value={newHotelData.seasons[0]?.name || ""}
                          onChange={(e) => newHotelData.seasons[0] && updateNewHotelSeason(newHotelData.seasons[0].id, { name: e.target.value })}
                          className={`bg-input ${getFieldErrorClass(!!newHotelData.seasons[0] && !!getAddSeasonError(newHotelData.seasons[0].id).name)}`}
                        />
                        {newHotelData.seasons[0] && getAddSeasonError(newHotelData.seasons[0].id).name && (
                          <p className="text-xs text-destructive">{getAddSeasonError(newHotelData.seasons[0].id).name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-season-start">Start Date</Label>
                        <Input
                          id="default-season-start"
                          type="date"
                          value={newHotelData.seasons[0]?.startDate || ""}
                          onChange={(e) => newHotelData.seasons[0] && updateNewHotelSeason(newHotelData.seasons[0].id, { startDate: e.target.value })}
                          className={`bg-input ${getFieldErrorClass(!!newHotelData.seasons[0] && !!getAddSeasonError(newHotelData.seasons[0].id).startDate)}`}
                        />
                        {newHotelData.seasons[0] && getAddSeasonError(newHotelData.seasons[0].id).startDate && (
                          <p className="text-xs text-destructive">{getAddSeasonError(newHotelData.seasons[0].id).startDate}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-season-end">End Date</Label>
                        <Input
                          id="default-season-end"
                          type="date"
                          value={newHotelData.seasons[0]?.endDate || ""}
                          onChange={(e) => newHotelData.seasons[0] && updateNewHotelSeason(newHotelData.seasons[0].id, { endDate: e.target.value })}
                          className={`bg-input ${getFieldErrorClass(!!newHotelData.seasons[0] && !!getAddSeasonError(newHotelData.seasons[0].id).endDate)}`}
                        />
                        {newHotelData.seasons[0] && getAddSeasonError(newHotelData.seasons[0].id).endDate && (
                          <p className="text-xs text-destructive">{getAddSeasonError(newHotelData.seasons[0].id).endDate}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="new-rate-double">Double Rate</Label>
                        <Input
                          id="new-rate-double"
                          type="number"
                          value={newHotelData.seasons[0]?.rates.double.ro.city.weekday || 0}
                          onChange={(e) => handleDefaultSeasonRateChange("double", "ro", "city", "weekday", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={`${PRICING_INPUT_CLASS} ${getFieldErrorClass(!!newHotelData.seasons[0] && !!getAddSeasonError(newHotelData.seasons[0].id).requiredRates.double)}`}
                        />
                        {newHotelData.seasons[0] && getAddSeasonError(newHotelData.seasons[0].id).requiredRates.double && (
                          <p className="text-xs text-destructive">Double rate is required.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-rate-triple">Triple Rate</Label>
                        <Input
                          id="new-rate-triple"
                          type="number"
                          value={newHotelData.seasons[0]?.rates.triple.ro.city.weekday || 0}
                          onChange={(e) => handleDefaultSeasonRateChange("triple", "ro", "city", "weekday", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={`${PRICING_INPUT_CLASS} ${getFieldErrorClass(!!newHotelData.seasons[0] && !!getAddSeasonError(newHotelData.seasons[0].id).requiredRates.triple)}`}
                        />
                        {newHotelData.seasons[0] && getAddSeasonError(newHotelData.seasons[0].id).requiredRates.triple && (
                          <p className="text-xs text-destructive">Triple rate is required.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-rate-quad">Quad Rate</Label>
                        <Input
                          id="new-rate-quad"
                          type="number"
                          value={newHotelData.seasons[0]?.rates.quad.ro.city.weekday || 0}
                          onChange={(e) => handleDefaultSeasonRateChange("quad", "ro", "city", "weekday", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={`${PRICING_INPUT_CLASS} ${getFieldErrorClass(!!newHotelData.seasons[0] && !!getAddSeasonError(newHotelData.seasons[0].id).requiredRates.quad)}`}
                        />
                        {newHotelData.seasons[0] && getAddSeasonError(newHotelData.seasons[0].id).requiredRates.quad && (
                          <p className="text-xs text-destructive">Quad rate is required.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-rate-quint">Quint Rate</Label>
                        <Input
                          id="new-rate-quint"
                          type="number"
                          value={newHotelData.seasons[0]?.rates.quintuple.ro.city.weekday || 0}
                          onChange={(e) => handleDefaultSeasonRateChange("quintuple", "ro", "city", "weekday", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={PRICING_INPUT_CLASS}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-rate-sext">Sext Rate</Label>
                        <Input
                          id="new-rate-sext"
                          type="number"
                          value={newHotelData.seasons[0]?.rates.sextuple.ro.city.weekday || 0}
                          onChange={(e) => handleDefaultSeasonRateChange("sextuple", "ro", "city", "weekday", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={PRICING_INPUT_CLASS}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-rate-sharing">Sharing Rate</Label>
                        <Input
                          id="new-rate-sharing"
                          type="number"
                          value={newHotelData.seasons[0]?.rates.sharing.ro.city.weekday || 0}
                          onChange={(e) => handleDefaultSeasonRateChange("sharing", "ro", "city", "weekday", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={`${PRICING_INPUT_CLASS} ${getFieldErrorClass(!!newHotelData.seasons[0] && !!getAddSeasonError(newHotelData.seasons[0].id).requiredRates.sharing)}`}
                        />
                        {newHotelData.seasons[0] && getAddSeasonError(newHotelData.seasons[0].id).requiredRates.sharing && (
                          <p className="text-xs text-destructive">Sharing rate is required.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedAddHotel(!showAdvancedAddHotel)}
                      >
                        {showAdvancedAddHotel ? "Hide Advanced Options" : "Show Advanced Options"}
                      </Button>
                      <div className="flex gap-2">
                        <Button onClick={handleAddHotel} size="sm" disabled={addInlineValidation.hasErrors} className="bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => setShowAddHotel(false)} size="sm" variant="outline">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {addInlineValidation.hasErrors && (
                      <p className="text-xs text-destructive">Please fix highlighted fields before saving.</p>
                    )}

                    {showAdvancedAddHotel && (
                      <div className="border border-border rounded-lg p-3 bg-background/40">
                        <p className="text-sm font-medium text-foreground mb-3">Advanced Pricing (Haram/Weekend)</p>
                        {(["double", "triple", "quad", "quintuple", "sextuple", "sharing"] as RoomType[]).map((roomType) => (
                          <div key={roomType} className="mb-4 last:mb-0">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{roomType}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                              {([
                                { key: "ro-city-weekend", label: "RO City WE", mealPlan: "ro", viewType: "city", dayType: "weekend" },
                                { key: "ro-haram-weekday", label: "RO Haram WD", mealPlan: "ro", viewType: "haram", dayType: "weekday" },
                                { key: "ro-haram-weekend", label: "RO Haram WE", mealPlan: "ro", viewType: "haram", dayType: "weekend" },
                                { key: "bb-city-weekday", label: "BB City WD", mealPlan: "bb", viewType: "city", dayType: "weekday" },
                                { key: "bb-city-weekend", label: "BB City WE", mealPlan: "bb", viewType: "city", dayType: "weekend" },
                                { key: "bb-haram-weekday", label: "BB Haram WD", mealPlan: "bb", viewType: "haram", dayType: "weekday" },
                                { key: "bb-haram-weekend", label: "BB Haram WE", mealPlan: "bb", viewType: "haram", dayType: "weekend" },
                              ] as const).map((field) => (
                                <div key={`${roomType}-${field.key}`} className="space-y-1">
                                  <Label htmlFor={`new-${roomType}-${field.key}`} className="text-xs">
                                    {field.label}
                                  </Label>
                                  <Input
                                    id={`new-${roomType}-${field.key}`}
                                    type="number"
                                    value={newHotelData.seasons[0]?.rates[roomType][field.mealPlan][field.viewType][field.dayType] || 0}
                                    onChange={(e) =>
                                      handleDefaultSeasonRateChange(
                                        roomType,
                                        field.mealPlan,
                                        field.viewType,
                                        field.dayType,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    onFocus={(e) => e.target.select()}
                                    className={`${PRICING_INPUT_CLASS} text-sm`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border border-border rounded-lg p-3 bg-background/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Additional Seasons</p>
                        <Button type="button" variant="outline" size="sm" onClick={addNewHotelSeason}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add New Season
                        </Button>
                      </div>
                      {newHotelData.seasons.length <= 1 ? (
                        <p className="text-xs text-muted-foreground">No additional seasons yet. The first season is configured above.</p>
                      ) : (
                        newHotelData.seasons.slice(1).map((season) => (
                          <div key={season.id} className="border border-border rounded-lg p-3 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                              <div className="space-y-1">
                                <Label htmlFor={`new-season-name-${season.id}`}>Season Name</Label>
                                <Input
                                  id={`new-season-name-${season.id}`}
                                  value={season.name}
                                  onChange={(e) => updateNewHotelSeason(season.id, { name: e.target.value })}
                                  className={`bg-input ${getFieldErrorClass(!!getAddSeasonError(season.id).name)}`}
                                />
                                {getAddSeasonError(season.id).name && (
                                  <p className="text-xs text-destructive">{getAddSeasonError(season.id).name}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`new-season-start-${season.id}`}>Start Date</Label>
                                <Input
                                  id={`new-season-start-${season.id}`}
                                  type="date"
                                  value={season.startDate}
                                  onChange={(e) => updateNewHotelSeason(season.id, { startDate: e.target.value })}
                                  className={`bg-input ${getFieldErrorClass(!!getAddSeasonError(season.id).startDate)}`}
                                />
                                {getAddSeasonError(season.id).startDate && (
                                  <p className="text-xs text-destructive">{getAddSeasonError(season.id).startDate}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`new-season-end-${season.id}`}>End Date</Label>
                                <Input
                                  id={`new-season-end-${season.id}`}
                                  type="date"
                                  value={season.endDate}
                                  onChange={(e) => updateNewHotelSeason(season.id, { endDate: e.target.value })}
                                  className={`bg-input ${getFieldErrorClass(!!getAddSeasonError(season.id).endDate)}`}
                                />
                                {getAddSeasonError(season.id).endDate && (
                                  <p className="text-xs text-destructive">{getAddSeasonError(season.id).endDate}</p>
                                )}
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => removeNewHotelSeason(season.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </div>

                            <Table>
                              <TableHeader>
                                <TableRow className="border-border">
                                  <TableHead>Room Type</TableHead>
                                  <TableHead className="text-center">RO</TableHead>
                                  <TableHead className="text-center">BB</TableHead>
                                  {showAdvancedAddHotel && (
                                    <>
                                      <TableHead className="text-center">RO City WE</TableHead>
                                      <TableHead className="text-center">RO Haram WD</TableHead>
                                      <TableHead className="text-center">RO Haram WE</TableHead>
                                      <TableHead className="text-center">BB City WE</TableHead>
                                      <TableHead className="text-center">BB Haram WD</TableHead>
                                      <TableHead className="text-center">BB Haram WE</TableHead>
                                    </>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(["double", "triple", "quad", "quintuple", "sextuple", "sharing"] as RoomType[]).map((roomType) => (
                                  <TableRow key={`${season.id}-${roomType}`} className="border-border">
                                    <TableCell className="capitalize">{roomType}</TableCell>
                                    <TableCell className="text-center">
                                      <Input
                                        type="number"
                                        value={season.rates[roomType].ro.city.weekday}
                                        onChange={(e) =>
                                          updateNewHotelSeasonRate(
                                            season.id,
                                            roomType,
                                            "ro",
                                            "city",
                                            "weekday",
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        onFocus={(e) => e.target.select()}
                                        className={`${PRICING_INPUT_CLASS} ${getFieldErrorClass(!!getAddSeasonError(season.id).requiredRates[roomType])}`}
                                      />
                                      {REQUIRED_ROOM_TYPES.includes(roomType) && getAddSeasonError(season.id).requiredRates[roomType] && (
                                        <p className="text-xs text-destructive">Required</p>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Input
                                        type="number"
                                        value={season.rates[roomType].bb.city.weekday}
                                        onChange={(e) =>
                                          updateNewHotelSeasonRate(
                                            season.id,
                                            roomType,
                                            "bb",
                                            "city",
                                            "weekday",
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        onFocus={(e) => e.target.select()}
                                        className={PRICING_INPUT_CLASS}
                                      />
                                    </TableCell>
                                    {showAdvancedAddHotel && (
                                      <>
                                        <TableCell className="text-center">
                                          <Input type="number" value={season.rates[roomType].ro.city.weekend} onChange={(e) => updateNewHotelSeasonRate(season.id, roomType, "ro", "city", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Input type="number" value={season.rates[roomType].ro.haram.weekday} onChange={(e) => updateNewHotelSeasonRate(season.id, roomType, "ro", "haram", "weekday", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Input type="number" value={season.rates[roomType].ro.haram.weekend} onChange={(e) => updateNewHotelSeasonRate(season.id, roomType, "ro", "haram", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Input type="number" value={season.rates[roomType].bb.city.weekend} onChange={(e) => updateNewHotelSeasonRate(season.id, roomType, "bb", "city", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Input type="number" value={season.rates[roomType].bb.haram.weekday} onChange={(e) => updateNewHotelSeasonRate(season.id, roomType, "bb", "haram", "weekday", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Input type="number" value={season.rates[roomType].bb.haram.weekend} onChange={(e) => updateNewHotelSeasonRate(season.id, roomType, "bb", "haram", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} />
                                        </TableCell>
                                      </>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-secondary/50">
                      <TableHead className="text-muted-foreground">Hotel Name</TableHead>
                      <TableHead className="text-muted-foreground">City</TableHead>
                      <TableHead className="text-muted-foreground">Tier</TableHead>
                      <TableHead className="text-muted-foreground text-right">Distance</TableHead>
                      <TableHead className="text-muted-foreground text-right">Double</TableHead>
                      <TableHead className="text-muted-foreground text-right">Triple</TableHead>
                      <TableHead className="text-muted-foreground text-right">Quad</TableHead>
                      <TableHead className="text-muted-foreground text-right">Quint</TableHead>
                      <TableHead className="text-muted-foreground text-right">Sext</TableHead>
                      <TableHead className="text-muted-foreground text-right">Sharing</TableHead>
                      <TableHead className="text-muted-foreground">Last Updated</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotels.map((hotel) => (
                      <TableRow key={hotel.id} className="border-border hover:bg-secondary/50">
                        <TableCell className="font-medium text-foreground">{hotel.name}</TableCell>
                        <TableCell className="capitalize text-foreground">{hotel.city}</TableCell>
                        <TableCell>
                          <Badge className={getTierColor(hotel.tier)}>{hotel.tier}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {hotel.distanceKm} km
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {hotel.rates.double.ro.city.weekday}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {hotel.rates.triple.ro.city.weekday}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {hotel.rates.quad.ro.city.weekday}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatRoomRateDisplay(hotel.rates.quintuple.ro.city.weekday)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatRoomRateDisplay(hotel.rates.sextuple.ro.city.weekday)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {hotel.rates.sharing.ro.city.weekday}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatAuditLabel(hotel)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingHotel(editingHotel === hotel.id ? null : hotel.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteHotel(hotel.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Expanded Hotel Rate Editor */}
              {editingHotel && (
                <HotelRateEditor
                  hotel={hotels.find((h) => h.id === editingHotel)!}
                  onSave={(updatedHotel) => {
                    setHotels(hotels.map((h) => (h.id === updatedHotel.id ? updatedHotel : h)))
                    setEditingHotel(null)
                  }}
                  onCancel={() => setEditingHotel(null)}
                  currencyRate={settings.currencyRate}
                  currentUser={currentUser}
                  hotels={hotels}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transport Tab */}
        <TabsContent value="transport" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Transport Rate Matrix</CardTitle>
              <CardDescription>
                Configure rates per route and vehicle type. Sharing Bus options use per-pax pricing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route Selector */}
              <div className="space-y-2">
                <Label>Select Route</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select
                    key={transportRoutes.map((route) => route.id).join("|")}
                    value={selectedRoute}
                    onValueChange={setSelectedRoute}
                  >
                    <SelectTrigger className="bg-input border-border min-w-[280px]">
                      <SelectValue placeholder="Select a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {transportRoutes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          <span className="font-mono text-xs mr-2">{route.code}</span>
                          {route.name}
                          {route.isSharing && (
                            <Badge variant="outline" className="ml-2 text-xs">Sharing Available</Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddRouteForm((prev) => !prev)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Route
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteTransportRoute}
                    disabled={transportRoutes.length <= 1 || !selectedRoute}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              {showAddRouteForm && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-border rounded-lg bg-secondary/20">
                  <div className="space-y-1">
                    <Label htmlFor="new-route-code">Route Code</Label>
                    <Input
                      id="new-route-code"
                      value={newRouteData.code}
                      onChange={(e) => setNewRouteData({ ...newRouteData, code: e.target.value })}
                      placeholder="e.g. MAK-MED"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-route-name">Route Name</Label>
                    <Input
                      id="new-route-name"
                      value={newRouteData.name}
                      onChange={(e) => setNewRouteData({ ...newRouteData, name: e.target.value })}
                      placeholder="Route display name"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-route-description">Description</Label>
                    <Input
                      id="new-route-description"
                      value={newRouteData.description}
                      onChange={(e) =>
                        setNewRouteData({ ...newRouteData, description: e.target.value })
                      }
                      placeholder="Optional description"
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
                      <input
                        type="checkbox"
                        checked={newRouteData.isSharing}
                        onChange={(e) =>
                          setNewRouteData({ ...newRouteData, isSharing: e.target.checked })
                        }
                      />
                      Sharing route
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddTransportRoute}
                      disabled={!newRouteData.code.trim() || !newRouteData.name.trim()}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save Route
                    </Button>
                  </div>
                </div>
              )}

              {selectedRouteData && (
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">{selectedRouteData.description}</p>
                </div>
              )}

              <Separator className="bg-border" />
              {transportInlineValidation.hasErrors && (
                <p className="text-xs text-destructive">
                  Please enter valid rates for all visible vehicle types.
                </p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Vehicle Types & Rates</p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddVehicleType}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add New Vehicle
                </Button>
              </div>

              {/* Vehicle Rates Table */}
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-secondary/50">
                    <TableHead className="text-muted-foreground">Vehicle Name</TableHead>
                    <TableHead className="text-muted-foreground text-center">Max Pax</TableHead>
                    <TableHead className="text-muted-foreground text-right">Rate (SAR)</TableHead>
                    <TableHead className="text-muted-foreground text-right">Rate (PKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleTypes.map((vehicle) => {
                      const rate = routeRates.find((r) => r.vehicleId === vehicle.id)
                      return (
                        <TableRow key={vehicle.id} className="border-border hover:bg-secondary/50">
                          <TableCell>
                            <Input
                              value={vehicle.displayName}
                              onChange={(e) =>
                                handleVehicleTypeChange(vehicle.id, { displayName: e.target.value })
                              }
                              className="bg-input border-border min-w-[220px]"
                            />
                            {vehicle.id === "sharing" && (
                              <Badge variant="outline" className="mt-1 text-xs">Per Pax</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {vehicle.id === "sharing" ? (
                              <span className="text-sm font-medium text-foreground">1</span>
                            ) : (
                              <Input
                                type="number"
                                value={vehicle.maxPax}
                                onChange={(e) =>
                                  handleVehicleTypeChange(vehicle.id, {
                                    maxPax: parseFloat(e.target.value) || 0,
                                  })
                                }
                                onFocus={(e) => e.target.select()}
                                className="w-20 mx-auto bg-input border-border text-center"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={rate?.rateSar || 0}
                              onChange={(e) =>
                                handleTransportRateChange(
                                  selectedRoute,
                                  vehicle.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              className={`w-24 ml-auto bg-input border-border text-right ${getFieldErrorClass(
                                vehicle.id !== "sharing" &&
                                  !!transportInlineValidation.rates[vehicle.id]
                              )}`}
                            />
                            {vehicle.id !== "sharing" && transportInlineValidation.rates[vehicle.id] && (
                              <p className="mt-1 text-xs text-destructive">
                                {transportInlineValidation.rates[vehicle.id]}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-primary font-semibold">
                            {Math.round((rate?.rateSar || 0) * settings.currencyRate).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visa Tab */}
        <TabsContent value="visa" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Visa Categories</CardTitle>
              <CardDescription>Configure visa types and their rates (SAR per person)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {visaInlineValidation.hasErrors && (
                <p className="text-xs text-destructive">
                  Please enter valid visa rates greater than 0.
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-secondary/50">
                    <TableHead className="text-muted-foreground">Visa Type</TableHead>
                    <TableHead className="text-muted-foreground">Code</TableHead>
                    <TableHead className="text-muted-foreground text-right">Rate (Adult/Child) SAR</TableHead>
                    <TableHead className="text-muted-foreground text-right">Rate (Infant) SAR</TableHead>
                    <TableHead className="text-muted-foreground text-right">Processing Fee SAR</TableHead>
                    <TableHead className="text-muted-foreground text-right">Service Charge SAR</TableHead>
                    <TableHead className="text-muted-foreground text-right">Total (PKR)*</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaCategories.map((visa) => {
                    const sampleTotalSar =
                      visa.adultRateSar + visa.processingFeeSar + visa.serviceChargeSar
                    return (
                    <TableRow key={visa.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-medium text-foreground">{visa.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{visa.code}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={visa.adultRateSar}
                          onChange={(e) =>
                            handleVisaAdultChildRateChange(visa.id, parseFloat(e.target.value) || 0)
                          }
                          onFocus={(e) => e.target.select()}
                          className={`w-24 ml-auto bg-input border-border text-right ${getFieldErrorClass(!!visaInlineValidation.adultChildRates[visa.id])}`}
                        />
                        {visaInlineValidation.adultChildRates[visa.id] && (
                          <p className="mt-1 text-xs text-destructive">
                            {visaInlineValidation.adultChildRates[visa.id]}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={visa.infantRateSar}
                          onChange={(e) =>
                            handleVisaInfantRateChange(visa.id, parseFloat(e.target.value) || 0)
                          }
                          onFocus={(e) => e.target.select()}
                          className="w-24 ml-auto bg-input border-border text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={visa.processingFeeSar}
                          onChange={(e) =>
                            handleVisaFeeChange(
                              visa.id,
                              "processingFeeSar",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="w-24 ml-auto bg-input border-border text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={visa.serviceChargeSar}
                          onChange={(e) =>
                            handleVisaFeeChange(
                              visa.id,
                              "serviceChargeSar",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="w-24 ml-auto bg-input border-border text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-primary font-semibold">
                        {Math.round(sampleTotalSar * settings.currencyRate).toLocaleString()}
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                * Total (PKR) preview uses one adult fare plus processing fee and service charge.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}

// Hotel Rate Editor Component
function HotelRateEditor({
  hotel,
  onSave,
  onCancel,
  currencyRate: _currencyRate,
  currentUser,
  hotels,
}: {
  hotel: Hotel
  onSave: (hotel: Hotel) => void
  onCancel: () => void
  currencyRate: number
  currentUser: User | null
  hotels: Hotel[]
}) {
  const [editedHotel, setEditedHotel] = useState<Hotel>({ ...hotel })
  const [advancedView, setAdvancedView] = useState(false)
  const [editErrors, setEditErrors] = useState<string[]>([])
  const [activeSeasonEditorId, setActiveSeasonEditorId] = useState<string | null>(null)

  const roomTypesAll: RoomType[] = ["double", "triple", "quad", "quintuple", "sextuple", "sharing"]

  type DayType = "weekday" | "weekend"
  type PricingColumn = {
    key: string
    mealPlan: MealPlan
    viewType: ViewType
    dayType: DayType
    label: string
  }

  const columnsStandard: PricingColumn[] = [
    { key: "ro-city-weekday", mealPlan: "ro", viewType: "city", dayType: "weekday", label: "RO" },
    { key: "bb-city-weekday", mealPlan: "bb", viewType: "city", dayType: "weekday", label: "BB" },
  ]

  const columnsAdvanced: PricingColumn[] = [
    { key: "ro-city-weekday", mealPlan: "ro", viewType: "city", dayType: "weekday", label: "RO City WD" },
    { key: "ro-city-weekend", mealPlan: "ro", viewType: "city", dayType: "weekend", label: "RO City WE" },
    { key: "ro-haram-weekday", mealPlan: "ro", viewType: "haram", dayType: "weekday", label: "RO Haram WD" },
    { key: "ro-haram-weekend", mealPlan: "ro", viewType: "haram", dayType: "weekend", label: "RO Haram WE" },
    { key: "bb-city-weekday", mealPlan: "bb", viewType: "city", dayType: "weekday", label: "BB City WD" },
    { key: "bb-city-weekend", mealPlan: "bb", viewType: "city", dayType: "weekend", label: "BB City WE" },
    { key: "bb-haram-weekday", mealPlan: "bb", viewType: "haram", dayType: "weekday", label: "BB Haram WD" },
    { key: "bb-haram-weekend", mealPlan: "bb", viewType: "haram", dayType: "weekend", label: "BB Haram WE" },
  ]

  const columnsToShow = advancedView ? columnsAdvanced : columnsStandard
  const roomTypesToConsider = roomTypesAll

  const isEmptyPrice = (value: number) => value === 0 || Number.isNaN(value)

  const getPrice = (roomType: RoomType, col: PricingColumn) => editedHotel.rates[roomType][col.mealPlan][col.viewType][col.dayType]

  // Hide fully-empty pricing columns/rows for the active view.
  const visibleColumns = columnsToShow.filter((col) =>
    roomTypesToConsider.some((roomType) => !isEmptyPrice(getPrice(roomType, col)))
  )

  const visibleRoomTypes = roomTypesToConsider.filter((roomType) =>
    visibleColumns.some((col) => !isEmptyPrice(getPrice(roomType, col)))
  )
  const editInlineValidation = getHotelInlineValidation(
    { name: editedHotel.name, seasons: editedHotel.seasons ?? [] },
    hotels,
    editedHotel.id
  )
  const getEditSeasonError = (seasonId: string) =>
    editInlineValidation.seasons[seasonId] || { requiredRates: {} }
  const getFieldErrorClass = (hasError: boolean) =>
    hasError ? "border-destructive focus-visible:ring-destructive" : ""

  const handleRateChange = (
    roomType: RoomType,
    mealPlan: MealPlan,
    viewType: ViewType,
    dayType: "weekday" | "weekend",
    value: number
  ) => {
    const safeValue = sanitizeNonNegative(value)
    setEditedHotel({
      ...editedHotel,
      rates: {
        ...editedHotel.rates,
        [roomType]: {
          ...editedHotel.rates[roomType],
          [mealPlan]: {
            ...editedHotel.rates[roomType][mealPlan],
            [viewType]: {
              ...editedHotel.rates[roomType][mealPlan][viewType],
              [dayType]: safeValue,
            },
          },
        },
      },
    })
  }

  const addHotelSeason = () => {
    const newSeasonId = Date.now().toString()
    setEditedHotel({
      ...editedHotel,
      seasons: [
        ...(editedHotel.seasons ?? []),
        {
          id: newSeasonId,
          name: "",
          startDate: "",
          endDate: "",
          isBaseSeason: false,
          rates: {
            ...editedHotel.rates,
          },
        },
      ],
    })
    setActiveSeasonEditorId(newSeasonId)
  }

  const updateHotelSeason = (seasonId: string, patch: Partial<HotelSeason>) => {
    setEditedHotel({
      ...editedHotel,
      seasons: (editedHotel.seasons ?? []).map((season) =>
        season.id === seasonId ? { ...season, ...patch } : season
      ),
    })
  }

  const removeHotelSeason = (seasonId: string) => {
    if ((editedHotel.seasons ?? [])[0]?.id === seasonId) return
    setEditedHotel({
      ...editedHotel,
      seasons: (editedHotel.seasons ?? []).filter((season) => season.id !== seasonId),
    })
    if (activeSeasonEditorId === seasonId) {
      setActiveSeasonEditorId(null)
    }
  }

  const handleSaveEditedHotel = () => {
    const errors = validateHotelPayload(
      {
        name: editedHotel.name,
        seasons: editedHotel.seasons ?? [],
      },
      hotels,
      editedHotel.id
    )

    if (errors.length > 0) {
      setEditErrors(errors)
      return
    }

    const finalized = finalizeHotelForSave(editedHotel, currentUser?.name || "Admin")
    setEditErrors([])
    onSave(finalized)
  }

  const updateHotelSeasonRate = (
    seasonId: string,
    roomType: RoomType,
    mealPlan: MealPlan,
    viewType: ViewType,
    dayType: "weekday" | "weekend",
    value: number
  ) => {
    const safeValue = sanitizeNonNegative(value)
    setEditedHotel({
      ...editedHotel,
      seasons: (editedHotel.seasons ?? []).map((season) =>
        season.id === seasonId
          ? {
              ...season,
              rates: {
                ...season.rates,
                [roomType]: {
                  ...season.rates[roomType],
                  [mealPlan]: {
                    ...season.rates[roomType][mealPlan],
                    [viewType]: {
                      ...season.rates[roomType][mealPlan][viewType],
                      [dayType]: safeValue,
                    },
                  },
                },
              },
            }
          : season
      ),
    })
  }

  const roomTypeLabels: Record<RoomType, string> = {
    double: "Double (2)",
    triple: "Triple (3)",
    quad: "Quad (4)",
    quintuple: "Quintuple (5)",
    sextuple: "Sextuple (6)",
    sharing: "Per Bed",
  }
  const activeSeason = (editedHotel.seasons ?? []).find(
    (season) => season.id === activeSeasonEditorId
  )

  return (
    <div className="mt-4 p-4 border border-primary/30 rounded-lg bg-primary/5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="edit-hotel-name">Hotel Name</Label>
          <Input
            id="edit-hotel-name"
            value={editedHotel.name}
            onChange={(e) => setEditedHotel({ ...editedHotel, name: e.target.value })}
            className={`bg-input border-border ${getFieldErrorClass(!!editInlineValidation.hotelName)}`}
          />
          {editInlineValidation.hotelName && (
            <p className="text-xs text-destructive">{editInlineValidation.hotelName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-hotel-city">City</Label>
          <Select
            value={editedHotel.city}
            onValueChange={(value) =>
              setEditedHotel({ ...editedHotel, city: value as "makkah" | "madinah" })
            }
          >
            <SelectTrigger id="edit-hotel-city" className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="makkah">Makkah</SelectItem>
              <SelectItem value="madinah">Madinah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-hotel-tier">Tier</Label>
          <Select
            value={editedHotel.tier}
            onValueChange={(value) =>
              setEditedHotel({ ...editedHotel, tier: value as "economy" | "standard" | "luxury" })
            }
          >
            <SelectTrigger id="edit-hotel-tier" className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-hotel-distance">Distance (km)</Label>
          <Input
            id="edit-hotel-distance"
            type="number"
            value={editedHotel.distanceKm}
            onChange={(e) =>
              setEditedHotel({ ...editedHotel, distanceKm: sanitizeNonNegative(parseFloat(e.target.value) || 0) })
            }
            onFocus={(e) => e.target.select()}
            className="bg-input border-border"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-4 p-3 border border-border rounded-lg bg-background/50">
        <div className="flex items-center gap-2">
          <Switch
            checked={editedHotel.mealPlanEnabled !== false}
            onCheckedChange={(checked) =>
              setEditedHotel({ ...editedHotel, mealPlanEnabled: checked })
            }
          />
          <Label className="text-sm">Show Meal Plan to staff</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={editedHotel.viewTypeEnabled !== false}
            onCheckedChange={(checked) =>
              setEditedHotel({ ...editedHotel, viewTypeEnabled: checked })
            }
          />
          <Label className="text-sm">Show View Type to staff</Label>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <div className="flex gap-2">
          <Button onClick={handleSaveEditedHotel} size="sm" disabled={editInlineValidation.hasErrors} className="bg-accent text-accent-foreground disabled:opacity-60">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button onClick={onCancel} size="sm" variant="outline">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
      {editErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {editErrors.map((error, idx) => (
                <li key={`${error}-${idx}`}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {editInlineValidation.hasErrors && (
        <p className="text-xs text-destructive mb-3">Please fix highlighted fields before saving.</p>
      )}

      <div className="flex items-center justify-between mb-3">
        <Label htmlFor="advanced-view-toggle" className="text-sm">
          Advanced View
        </Label>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{advancedView ? "All pricing fields" : "Essential fields only"}</span>
          <Switch
            id="advanced-view-toggle"
            checked={advancedView}
            onCheckedChange={(checked) => setAdvancedView(checked)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Room Type</TableHead>
              {visibleColumns.map((col) => (
                <TableHead key={col.key} className="text-muted-foreground text-center">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {visibleRoomTypes.length === 0 || visibleColumns.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={1 + visibleColumns.length} className="text-center text-muted-foreground">
                  No pricing fields set.
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {visibleRoomTypes.map((roomType) => (
                <TableRow key={roomType} className="border-border">
                  <TableCell className="font-medium text-foreground">{roomTypeLabels[roomType]}</TableCell>
                  {visibleColumns.map((col) => (
                    <TableCell key={`${roomType}-${col.key}`} className="p-1 text-center">
                      <Input
                        type="number"
                        value={getPrice(roomType, col)}
                        onChange={(e) =>
                          handleRateChange(
                            roomType,
                            col.mealPlan,
                            col.viewType,
                            col.dayType,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                        className={`${PRICING_INPUT_CLASS} ${getFieldErrorClass(
                          col.key === "ro-city-weekday" && !!getEditSeasonError((editedHotel.seasons ?? [])[0]?.id || "").requiredRates[roomType]
                        )}`}
                      />
                      {col.key === "ro-city-weekday" &&
                        REQUIRED_ROOM_TYPES.includes(roomType) &&
                        getEditSeasonError((editedHotel.seasons ?? [])[0]?.id || "").requiredRates[roomType] && (
                          <p className="text-xs text-destructive">Required</p>
                        )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        RO = Room Only, BB = Bed & Breakfast, WD = Weekday, WE = Weekend (Thu/Fri)
      </p>

      <div className="mt-4 border border-border rounded-lg p-3 bg-background/40 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Seasons</p>
          <Button type="button" variant="outline" size="sm" onClick={addHotelSeason}>
            <Plus className="w-4 h-4 mr-1" />
            Add New Season
          </Button>
        </div>
        {(editedHotel.seasons ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No seasons configured for this hotel.</p>
        ) : (
          <div className="space-y-2">
            {(editedHotel.seasons ?? []).map((season) => (
              <div key={season.id} className="border border-border rounded-lg p-3 bg-background/50">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <div className="font-medium text-foreground">{season.name || "Unnamed season"}</div>
                  <div className="text-xs text-muted-foreground">
                    {season.startDate || "No start"} - {season.endDate || "No end"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {season.isBaseSeason ? "Base Season" : "Additional Season"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Double RO: {formatRoomRateDisplay(season.rates.double.ro.city.weekday)}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveSeasonEditorId(season.id)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeHotelSeason(season.id)}
                      disabled={!!season.isBaseSeason}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {season.isBaseSeason ? "Base Season" : "Remove"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeSeason ? (
          <div className="border border-border rounded-lg p-3 space-y-3 bg-background/70">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Editing: {activeSeason.name || "Unnamed season"}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveSeasonEditorId(null)}>
                <X className="w-4 h-4 mr-1" />
                Close Editor
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor={`edit-season-name-${activeSeason.id}`}>Season Name</Label>
                <Input
                  id={`edit-season-name-${activeSeason.id}`}
                  value={activeSeason.name}
                  onChange={(e) => updateHotelSeason(activeSeason.id, { name: e.target.value })}
                  className={`bg-input border-border ${getFieldErrorClass(!!getEditSeasonError(activeSeason.id).name)}`}
                />
                {getEditSeasonError(activeSeason.id).name && (
                  <p className="text-xs text-destructive">{getEditSeasonError(activeSeason.id).name}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-season-start-${activeSeason.id}`}>Start Date</Label>
                <Input
                  id={`edit-season-start-${activeSeason.id}`}
                  type="date"
                  value={activeSeason.startDate}
                  onChange={(e) => updateHotelSeason(activeSeason.id, { startDate: e.target.value })}
                  className={`bg-input border-border ${getFieldErrorClass(!!getEditSeasonError(activeSeason.id).startDate)}`}
                />
                {getEditSeasonError(activeSeason.id).startDate && (
                  <p className="text-xs text-destructive">{getEditSeasonError(activeSeason.id).startDate}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-season-end-${activeSeason.id}`}>End Date</Label>
                <Input
                  id={`edit-season-end-${activeSeason.id}`}
                  type="date"
                  value={activeSeason.endDate}
                  onChange={(e) => updateHotelSeason(activeSeason.id, { endDate: e.target.value })}
                  className={`bg-input border-border ${getFieldErrorClass(!!getEditSeasonError(activeSeason.id).endDate)}`}
                />
                {getEditSeasonError(activeSeason.id).endDate && (
                  <p className="text-xs text-destructive">{getEditSeasonError(activeSeason.id).endDate}</p>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeHotelSeason(activeSeason.id)}
                  disabled={!!activeSeason.isBaseSeason}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {activeSeason.isBaseSeason ? "Base Season" : "Remove"}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Room Type</TableHead>
                  <TableHead className="text-center">RO</TableHead>
                  <TableHead className="text-center">BB</TableHead>
                  {advancedView && (
                    <>
                      <TableHead className="text-center">RO City WE</TableHead>
                      <TableHead className="text-center">RO Haram WD</TableHead>
                      <TableHead className="text-center">RO Haram WE</TableHead>
                      <TableHead className="text-center">BB City WE</TableHead>
                      <TableHead className="text-center">BB Haram WD</TableHead>
                      <TableHead className="text-center">BB Haram WE</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypesAll.map((roomType) => (
                  <TableRow key={`${activeSeason.id}-${roomType}`} className="border-border">
                    <TableCell>{roomTypeLabels[roomType]}</TableCell>
                    <TableCell className="text-center">
                      <Input type="number" value={activeSeason.rates[roomType].ro.city.weekday} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "ro", "city", "weekday", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={`${PRICING_INPUT_CLASS} ${getFieldErrorClass(!!getEditSeasonError(activeSeason.id).requiredRates[roomType])}`} />
                      {REQUIRED_ROOM_TYPES.includes(roomType) && getEditSeasonError(activeSeason.id).requiredRates[roomType] && (
                        <p className="text-xs text-destructive">Required</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input type="number" value={activeSeason.rates[roomType].bb.city.weekday} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "bb", "city", "weekday", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} />
                    </TableCell>
                    {advancedView && (
                      <>
                        <TableCell className="text-center"><Input type="number" value={activeSeason.rates[roomType].ro.city.weekend} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "ro", "city", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} /></TableCell>
                        <TableCell className="text-center"><Input type="number" value={activeSeason.rates[roomType].ro.haram.weekday} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "ro", "haram", "weekday", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} /></TableCell>
                        <TableCell className="text-center"><Input type="number" value={activeSeason.rates[roomType].ro.haram.weekend} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "ro", "haram", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} /></TableCell>
                        <TableCell className="text-center"><Input type="number" value={activeSeason.rates[roomType].bb.city.weekend} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "bb", "city", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} /></TableCell>
                        <TableCell className="text-center"><Input type="number" value={activeSeason.rates[roomType].bb.haram.weekday} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "bb", "haram", "weekday", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} /></TableCell>
                        <TableCell className="text-center"><Input type="number" value={activeSeason.rates[roomType].bb.haram.weekend} onChange={(e) => updateHotelSeasonRate(activeSeason.id, roomType, "bb", "haram", "weekend", parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={PRICING_INPUT_CLASS} /></TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click Edit on a season or Add New Season to open the full season form.
          </p>
        )}
      </div>
    </div>
  )
}
