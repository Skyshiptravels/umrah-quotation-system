"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminDashboard } from "@/components/admin-dashboard"
import { StaffDashboard } from "@/components/staff-dashboard"
import { QuotationLedger } from "@/components/quotation-ledger"
import { LoginGateway } from "@/components/login-gateway"
import { Plane, Settings, Calculator, Shield, FileText, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createBaseSeason, createHotelRates } from "@/lib/hotel-rates"

export type RoomType = "double" | "triple" | "quad" | "quintuple" | "sextuple" | "sharing"
export type MealPlan = "ro" | "bb"
export type ViewType = "city" | "haram"
export type UserRole = "admin" | "staff" | "agent"
export type AgentCategory = "category1" | "category2" | "category3"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  agentCategory?: AgentCategory
}

export interface AgentMarginConfig {
  category1: number // In-House Staff (0 margin)
  category2: number // Standard Freelancers
  category3: number // Premium Freelancers
}

export interface Hotel {
  id: string
  name: string
  city: "makkah" | "madinah"
  tier: "economy" | "standard" | "luxury"
  distanceKm: number
  /** When false, staff cannot select meal plan for this hotel. */
  mealPlanEnabled?: boolean
  /** When false, staff cannot select view type for this hotel. */
  viewTypeEnabled?: boolean
  updatedAt?: string
  updatedBy?: string
  rates: {
    [key in RoomType]: {
      [meal in MealPlan]: {
        [view in ViewType]: {
          weekday: number
          weekend: number
        }
      }
    }
  }
  seasons?: HotelSeason[]
}

export interface HotelSeason {
  id: string
  name: string
  startDate: string
  endDate: string
  isBaseSeason?: boolean
  rates: Hotel["rates"]
}

export interface VehicleType {
  id: string
  name: string
  displayName: string
  minPax: number
  maxPax: number
}

export interface TransportRoute {
  id: string
  code: string
  name: string
  description: string
  isSharing: boolean
  sortOrder: number
}

export interface TransportRate {
  id: string
  routeId: string
  vehicleId: string
  rateSar: number
}

export interface VisaCategory {
  id: string
  name: string
  code: string
  adultRateSar: number
  childRateSar: number
  infantRateSar: number
  /** Per-person visa processing fee (SAR). */
  processingFeeSar: number
  /** Per-person service charge for visa handling (SAR). */
  serviceChargeSar: number
}

export interface GlobalSettings {
  currencyRate: number
  profitMargin: number
  profitType: "fixed" | "percentage"
  groundHandlingFee: number
  hideRatesFromStaff: boolean
  agentMargins: AgentMarginConfig
  enableMealOptions: boolean
  enableViewOptions: boolean
  enableQuintupleSextuple: boolean
}

export type QuotationStatus = "draft" | "confirmed"

export interface SavedQuotation {
  id: string
  quotationNo: string
  clientName: string
  clientEmail: string
  agentId: string
  agentName: string
  agentCategory?: AgentCategory
  totalPricePkr: number
  status: QuotationStatus
  createdAt: string
  quotationData: unknown
}

// ============ VEHICLE TYPES ============

export const defaultVehicleTypes: VehicleType[] = [
  { id: "car", name: "car", displayName: "Car (Camry/Sonata)", minPax: 1, maxPax: 3 },
  { id: "van", name: "van", displayName: "Family Van (H1/Staria/Starex)", minPax: 3, maxPax: 6 },
  { id: "gmc", name: "gmc", displayName: "Luxury SUV (GMC)", minPax: 3, maxPax: 6 },
  { id: "hiace", name: "hiace", displayName: "Toyota Hiace", minPax: 6, maxPax: 9 },
  { id: "coaster", name: "coaster", displayName: "Coaster", minPax: 9, maxPax: 18 },
  { id: "bus", name: "bus", displayName: "Bus", minPax: 18, maxPax: 49 },
  { id: "sharing", name: "sharing", displayName: "Sharing Bus (Per Pax)", minPax: 1, maxPax: 1 },
]

// ============ TRANSPORT ROUTES (Ordered as per requirement) ============

export const defaultTransportRoutes: TransportRoute[] = [
  { id: "jed-mak", code: "JED-MAK", name: "Jeddah Airport to Makkah Hotel", description: "Airport pickup to Makkah", isSharing: false, sortOrder: 1 },
  { id: "mak-med", code: "MAK-MED", name: "Makkah Hotel to Madinah Hotel", description: "Makkah to Madinah intercity", isSharing: true, sortOrder: 2 },
  { id: "med-mak", code: "MED-MAK", name: "Madinah Hotel to Makkah Hotel", description: "Madinah to Makkah intercity", isSharing: true, sortOrder: 3 },
  { id: "mak-jed", code: "MAK-JED", name: "Makkah Hotel to Jeddah Airport", description: "Makkah to Jeddah airport drop", isSharing: true, sortOrder: 4 },
  { id: "med-jed", code: "MED-JED", name: "Madinah Hotel to Jeddah Airport", description: "Madinah to Jeddah airport drop", isSharing: false, sortOrder: 5 },
  { id: "jed-med", code: "JED-MED", name: "Jeddah Airport to Madinah Hotel", description: "Direct long route arrival", isSharing: false, sortOrder: 6 },
  { id: "med-apt-htl", code: "MED_APT-HTL", name: "Madinah Airport to Madinah Hotel", description: "Madinah airport arrival", isSharing: false, sortOrder: 7 },
  { id: "med-htl-apt", code: "MED_HTL-APT", name: "Madinah Hotel to Madinah Airport", description: "Madinah airport departure", isSharing: false, sortOrder: 8 },
  { id: "round-trip-1", code: "ROUND-TRIP", name: "Full Round Trip (JED-MAK-MED-JED)", description: "Complete circuit via Jeddah", isSharing: false, sortOrder: 9 },
  { id: "round-trip-2", code: "ROUND-TRIP-2", name: "Full Route (JED-MAK-MED-MED Airport)", description: "Jeddah arrival, Madinah departure", isSharing: false, sortOrder: 10 },
  { id: "round-trip-special", code: "ROUND-TRIP-SPL", name: "Full Round Trip Special (JED-MAK-MED-MAK-JED)", description: "Round trip with double Makkah", isSharing: false, sortOrder: 11 },
  { id: "mak-ziyarat", code: "MAK-ZIY", name: "Makkah Ziyarat", description: "Makkah holy sites tour", isSharing: true, sortOrder: 12 },
  { id: "med-ziyarat", code: "MED-ZIY", name: "Madinah Ziyarat", description: "Madinah holy sites tour", isSharing: true, sortOrder: 13 },
]

// ============ DEFAULT TRANSPORT RATES ============

const generateDefaultTransportRates = (): TransportRate[] => {
  const rates: TransportRate[] = []
  const baseRates: Record<string, Record<string, number>> = {
    "jed-mak": { car: 350, van: 500, gmc: 700, hiace: 600, coaster: 900, bus: 1200 },
    "mak-med": { car: 1200, van: 1600, gmc: 2200, hiace: 1800, coaster: 2500, bus: 3500, sharing: 120 },
    "med-mak": { car: 1200, van: 1600, gmc: 2200, hiace: 1800, coaster: 2500, bus: 3500, sharing: 120 },
    "med-jed": { car: 1400, van: 1900, gmc: 2600, hiace: 2100, coaster: 3000, bus: 4200 },
    "mak-jed": { car: 350, van: 500, gmc: 700, hiace: 600, coaster: 900, bus: 1200, sharing: 60 },
    "med-apt-htl": { car: 200, van: 300, gmc: 450, hiace: 350, coaster: 500, bus: 700 },
    "med-htl-apt": { car: 200, van: 300, gmc: 450, hiace: 350, coaster: 500, bus: 700 },
    "jed-med": { car: 1500, van: 2000, gmc: 2800, hiace: 2300, coaster: 3200, bus: 4500 },
    "round-trip-1": { car: 2500, van: 3500, gmc: 4500, hiace: 3800, coaster: 5500, bus: 7500 },
    "round-trip-2": { car: 2300, van: 3200, gmc: 4200, hiace: 3500, coaster: 5000, bus: 7000 },
    "round-trip-special": { car: 3200, van: 4500, gmc: 5800, hiace: 4800, coaster: 7000, bus: 9500 },
    "mak-ziyarat": { car: 300, van: 450, gmc: 600, hiace: 500, coaster: 700, bus: 1000, sharing: 50 },
    "med-ziyarat": { car: 300, van: 450, gmc: 600, hiace: 500, coaster: 700, bus: 1000, sharing: 50 },
  }

  Object.entries(baseRates).forEach(([routeId, vehicleRates]) => {
    Object.entries(vehicleRates).forEach(([vehicleId, rate]) => {
      rates.push({
        id: `${routeId}-${vehicleId}`,
        routeId,
        vehicleId,
        rateSar: rate,
      })
    })
  })

  return rates
}

export const defaultTransportRates = generateDefaultTransportRates()

// ============ VISA CATEGORIES (Split Adult/Child/Infant) ============

export const defaultVisaCategories: VisaCategory[] = [
  { id: "visa-no-brn", name: "Visa Without BRN", code: "NO-BRN", adultRateSar: 535, childRateSar: 535, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-brn-21", name: "Visa With BRN (21 Days)", code: "BRN-21", adultRateSar: 450, childRateSar: 450, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-brn-28", name: "Visa With BRN (28 Days)", code: "BRN-28", adultRateSar: 480, childRateSar: 480, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-iqama", name: "Long-Stay Visa With Iqama", code: "IQAMA", adultRateSar: 350, childRateSar: 350, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
  { id: "visa-no-iqama", name: "Long-Stay Visa Without Iqama", code: "NO-IQAMA", adultRateSar: 600, childRateSar: 600, infantRateSar: 0, processingFeeSar: 0, serviceChargeSar: 0 },
]

// ============ DEFAULT HOTELS ============

const createDefaultHotel = (
  id: string,
  name: string,
  city: "makkah" | "madinah",
  tier: "economy" | "standard" | "luxury",
  baseDouble: number
): Hotel => {
  const rates = createHotelRates(baseDouble)
  return {
    id,
    name,
    city,
    tier,
    distanceKm: 0,
    rates,
    seasons: [createBaseSeason(rates)],
    mealPlanEnabled: true,
    viewTypeEnabled: true,
    updatedAt: new Date().toISOString(),
    updatedBy: "System",
  }
}

export const defaultHotels: Hotel[] = [
  createDefaultHotel("1", "Al Kiswah Towers", "makkah", "economy", 350),
  createDefaultHotel("2", "Ajyad Makarim", "makkah", "standard", 500),
  createDefaultHotel("3", "Swissotel Al Maqam", "makkah", "luxury", 850),
  createDefaultHotel("4", "Al Haram Hotel", "madinah", "economy", 280),
  createDefaultHotel("5", "Dar Al Taqwa", "madinah", "standard", 450),
  createDefaultHotel("6", "Oberoi Madinah", "madinah", "luxury", 780),
]

// ============ DEFAULT SETTINGS ============

export const defaultSettings: GlobalSettings = {
  currencyRate: 74.50,
  profitMargin: 15000,
  profitType: "fixed",
  groundHandlingFee: 50,
  hideRatesFromStaff: false,
  agentMargins: {
    category1: 0,      // In-House Staff
    category2: 5000,   // Standard Freelancers (+5000 PKR/pax)
    category3: 3000,   // Premium Freelancers (+3000 PKR/pax)
  },
  enableMealOptions: true,
  enableViewOptions: true,
  enableQuintupleSextuple: true,
}

// ============ QUOTATION NUMBER GENERATOR ============

let quotationCounter = 1000

export function generateQuotationNumber(): string {
  const year = new Date().getFullYear()
  quotationCounter++
  return `ST-${year}-${quotationCounter.toString().padStart(4, "0")}`
}

// ============ MAIN COMPONENT ============

export default function Home() {
  const [hotels, setHotels] = useState<Hotel[]>(defaultHotels)
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(defaultVehicleTypes)
  const [transportRoutes, setTransportRoutes] = useState<TransportRoute[]>(
    defaultTransportRoutes.sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const [transportRates, setTransportRates] = useState<TransportRate[]>(defaultTransportRates)
  const [visaCategories, setVisaCategories] = useState<VisaCategory[]>(defaultVisaCategories)
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings)
  const [activeTab, setActiveTab] = useState("quotation")
  const [savedQuotations, setSavedQuotations] = useState<SavedQuotation[]>([])

  // Authentication State (simulated for prototype)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Dev mode role switcher
  const [devModeEnabled, setDevModeEnabled] = useState(true)

  const handleLogin = (user: User, _token: string) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken")
      localStorage.removeItem("authUser")
      localStorage.removeItem("authOrganization")
    }
    setCurrentUser(null)
    setIsLoggedIn(false)
  }

  const handleDevRoleSwitch = (role: UserRole) => {
    const devUsers: Record<UserRole, User> = {
      admin: { id: "admin-1", name: "Admin User", email: "admin@skyship.pk", role: "admin" },
      staff: { id: "staff-1", name: "Staff User", email: "staff@skyship.pk", role: "staff", agentCategory: "category1" },
      agent: { id: "agent-1", name: "Freelance Agent", email: "agent@skyship.pk", role: "agent", agentCategory: "category2" },
    }
    setCurrentUser(devUsers[role])
    setIsLoggedIn(true)
  }

  const handleSaveQuotation = (quotation: SavedQuotation) => {
    setSavedQuotations(prev => [quotation, ...prev])
  }

  // Show login if not logged in
  if (!isLoggedIn) {
    return <LoginGateway onLogin={handleLogin} />
  }

  const isAdmin = currentUser?.role === "admin"
  const isStaffOrAgent = currentUser?.role === "staff" || currentUser?.role === "agent"

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Plane className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Skyship Travels</h1>
                <p className="text-sm text-muted-foreground">Umrah Quotation System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Dev Mode Role Switcher */}
              {devModeEnabled && (
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-dashed border-primary/30">
                  <span className="text-xs text-muted-foreground hidden sm:inline">DEV:</span>
                  <Select value={currentUser?.role || "staff"} onValueChange={(v) => handleDevRoleSwitch(v as UserRole)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin View</SelectItem>
                      <SelectItem value="staff">Staff View</SelectItem>
                      <SelectItem value="agent">Agent View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* User Info */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {currentUser?.role === "admin" ? "Admin" : currentUser?.role === "staff" ? "Staff" : "Agent"}
                </Badge>
                <span className="text-sm text-muted-foreground hidden md:block">{currentUser?.name}</span>
              </div>

              {/* Currency Rate */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:block">SAR:</span>
                <span className="text-sm font-semibold text-primary">{settings.currencyRate}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6 bg-secondary">
            {isStaffOrAgent && (
              <TabsTrigger value="quotation" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">{currentUser?.role === "agent" ? "Agent" : "Staff"} Dashboard</span>
                <span className="sm:hidden">Quotation</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Panel</span>
                <span className="sm:hidden">Admin</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="ledger" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Quotation Ledger</span>
              <span className="sm:hidden">Ledger</span>
            </TabsTrigger>
          </TabsList>

          {isStaffOrAgent && (
            <TabsContent value="quotation" className="mt-0">
              <StaffDashboard
                hotels={hotels}
                vehicleTypes={vehicleTypes}
                transportRoutes={transportRoutes}
                transportRates={transportRates}
                visaCategories={visaCategories}
                settings={settings}
                currentUser={currentUser}
                onSaveQuotation={handleSaveQuotation}
              />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="admin" className="mt-0">
              <AdminDashboard
                hotels={hotels}
                setHotels={setHotels}
                vehicleTypes={vehicleTypes}
                setVehicleTypes={setVehicleTypes}
                transportRoutes={transportRoutes}
                setTransportRoutes={setTransportRoutes}
                transportRates={transportRates}
                setTransportRates={setTransportRates}
                visaCategories={visaCategories}
                setVisaCategories={setVisaCategories}
                settings={settings}
                setSettings={setSettings}
                currentUser={currentUser}
              />
            </TabsContent>
          )}

          <TabsContent value="ledger" className="mt-0">
            <QuotationLedger
              quotations={savedQuotations}
              currentUser={currentUser}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
