export type TabId = "passengers" | "hotels" | "transport" | "visa" | "summary";

export type MealPlanUpgrade = "RO" | "BB" | "HB" | "FB";

export interface HotelRoomLine {
  id: string;
  roomType: string;
  quantity: number;
  ratePerNight: number;
}

export interface HotelBlock {
  id: string;
  city: "Makkah" | "Madinah" | "";
  hotelId: string;
  bookingMode: "SHARING" | "PRIVATE";
  sharingRatePerBed: number;
  checkIn: string;
  nights: number;
  viewModifier: "NONE" | "HARAM_VIEW" | "KABA_VIEW";
  rooms: HotelRoomLine[];
  checkInLocked: boolean;
}

export interface TransportLine {
  id: string;
  routeId: string;
  vehicleType: string;
  costSar: number;
  capacity: number;
}

export interface SuggestedUpgrades {
  roomUpgradeMakkah: number;
  roomUpgradeMadinah: number;
  mealPlan: MealPlanUpgrade;
  mealPlanPremium: number;
  umrahTraining: boolean;
  meetGreet: boolean;
  medicalInsurance: boolean;
  emergencyEvacuation: boolean;
}

export interface QuotationFormState {
  clientId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerWhatsapp: string;
  adults: number;
  childrenWithBed: number;
  childrenWithoutBed: number;
  infants: number;
  airTicketAdultPkr: number;
  airTicketChildPkr: number;
  airTicketInfantPkr: number;
  hotels: HotelBlock[];
  upgrades: SuggestedUpgrades;
  transport: TransportLine[];
  visaCategoryId: string;
  hotelVendorId: string;
  transportVendorId: string;
  visaVendorId: string;
}

export interface HotelOption {
  hotel_id: string;
  name: string;
  city: string;
  address?: string | null;
  distance_m?: number | null;
  markaziya_status?: "INSIDE" | "OUTSIDE" | null;
  category?: string | null;
  amenities?: string[];
  staff_notes?: string | null;
  cancellation_policy?: string | null;
  pricing_model?: string | null;
  offers_sharing?: boolean;
  offers_private?: boolean;
  sharing_rate_per_bed?: number | null;
  distance_label?: string | null;
  season_start?: string | null;
  season_end?: string | null;
}

export interface RoomTypeOption {
  room_type: string;
  base_price_sar: number;
  max_occupancy: number;
}

export interface RouteOption {
  route_id: string;
  name: string;
}

export interface VehicleOption {
  vehicle_type: string;
  capacity: number;
  price_sar: number;
}

export interface VisaOption {
  category_id: string;
  code: string;
  name: string;
  adult_child_rate_sar: number;
  infant_rate_sar: number;
}

export const TABS: { id: TabId; label: string }[] = [
  { id: "passengers", label: "1. Passengers" },
  { id: "hotels", label: "2. Hotels" },
  { id: "transport", label: "3. Transport" },
  { id: "visa", label: "4. Visa" },
  { id: "summary", label: "5. Summary" },
];

export function createEmptyHotel(city: "Makkah" | "Madinah" | "" = "Makkah"): HotelBlock {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: crypto.randomUUID(),
    city,
    hotelId: "",
    bookingMode: "PRIVATE",
    sharingRatePerBed: 0,
    checkIn: today,
    nights: 4,
    viewModifier: city === "Makkah" ? "HARAM_VIEW" : "NONE",
    rooms: [{ id: crypto.randomUUID(), roomType: "Quad", quantity: 1, ratePerNight: 0 }],
    checkInLocked: false,
  };
}

export function initialFormState(): QuotationFormState {
  return {
    clientId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerWhatsapp: "",
    adults: 4,
    childrenWithBed: 3,
    childrenWithoutBed: 1,
    infants: 1,
    airTicketAdultPkr: 3500,
    airTicketChildPkr: 1750,
    airTicketInfantPkr: 0,
    hotels: [createEmptyHotel("Makkah")],
    upgrades: {
      roomUpgradeMakkah: 0,
      roomUpgradeMadinah: 0,
      mealPlan: "RO",
      mealPlanPremium: 0,
      umrahTraining: false,
      meetGreet: false,
      medicalInsurance: false,
      emergencyEvacuation: false,
    },
    transport: [{ id: crypto.randomUUID(), routeId: "", vehicleType: "", costSar: 0, capacity: 0 }],
    visaCategoryId: "",
    hotelVendorId: "",
    transportVendorId: "",
    visaVendorId: "",
  };
}
