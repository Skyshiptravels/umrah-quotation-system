export type Role =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "STAFF"
  | "AGENT"
  | "ACCOUNTS_MANAGER"
  | "VIEWER";

export type QuotationStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "INVOICED";

export type ViewModifier = "NONE" | "HARAM_VIEW" | "KABA_VIEW";
export type MealPlan = "RO" | "BB";

export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: Role;
  staff_margin_percent: number;
  is_active: boolean;
}

export interface JwtPayload {
  user_id: string;
  email: string;
  role: Role;
  organization_id: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Hotel {
  id: string;
  organization_id: string;
  name: string;
  city: string;
  address: string | null;
  distance_m: number | null;
  markaziya_status: "INSIDE" | "OUTSIDE" | null;
  category: string | null;
  amenities: string[];
  contact_phone: string | null;
  cancellation_policy: string | null;
  staff_notes: string | null;
  pricing_model: string | null;
  meal_plan_bb_premium_sar: number;
  enabled_room_types: string[];
}

export interface HotelRoom {
  id: string;
  hotel_id: string;
  room_type: string;
  base_price_sar: number;
  max_occupancy: number;
}

export interface HotelSeason {
  id: string;
  hotel_id: string;
  start_date: string;
  end_date: string;
  season_multiplier: number;
}

export interface TransportRoute {
  id: string;
  name: string;
  start_city: string;
  end_city: string;
  distance_km: number | null;
}

export interface VehicleOption {
  vehicle_type: string;
  capacity_pax: number;
  price_sar: number;
  is_sharing: boolean;
}

export interface VisaCategory {
  id: string;
  code: string;
  name: string;
  adult_child_rate_sar: number;
  infant_rate_sar: number;
}

export interface PassengerCounts {
  adults: number;
  children_with_bed: number;
  children_without_bed: number;
  infants: number;
}

export interface RoomAssignment {
  rooms: Array<{ room_type: string; quantity: number; beds: number }>;
  total_beds: number;
  beds_needed: number;
  is_optimal: boolean;
}

export interface RoomAssignmentOption {
  label: string;
  assignment: RoomAssignment;
  estimated_cost_sar?: number;
}

export interface HotelPricingInput {
  room_type: string;
  base_price_sar: number;
  quantity: number;
  nights: number;
  view_modifier: ViewModifier;
  meal_plan: MealPlan;
  meal_premium_sar: number;
  city: string;
  check_in_date: string;
  check_out_date: string;
  seasons: HotelSeason[];
  commission_rate_percent: number;
}

export interface HotelPricingResult {
  room_type: string;
  quantity: number;
  nights: number;
  price_per_night_sar: number;
  room_total_sar: number;
  commission_sar: number;
  net_cost_sar: number;
  breakdown: string[];
}

export interface QuotationCostBreakdown {
  hotel_cost_sar: number;
  transport_cost_sar: number;
  visa_cost_sar: number;
  transfers_cost_sar: number;
  upgrades_cost_sar?: number;
  flights_cost_pkr: number;
  subtotal_sar: number;
  discount_amount_sar: number;
  total_cost_sar: number;
  total_cost_pkr: number;
  currency_rate: number;
  hotel_details: HotelPricingResult[];
  transport_details: Array<{ route: string; vehicle_type: string; cost_sar: number }>;
  visa_details: { category: string; adults_children_cost: number; infants_cost: number };
}

export const VIEW_MODIFIERS: Record<ViewModifier, number> = {
  NONE: 0,
  HARAM_VIEW: 200,
  KABA_VIEW: 400,
};

export const STANDARD_ROOM_TYPES: Record<string, number> = {
  Single: 1,
  Double: 2,
  Triple: 3,
  Quad: 4,
  Sharing: 1,
  Quint: 5,
  Sext: 6,
  Seven: 7,
  Eight: 8,
};

export const PERMISSIONS = {
  MANAGE_USERS: 1 << 0,
  MANAGE_HOTELS: 1 << 1,
  MANAGE_TRANSPORT: 1 << 2,
  MANAGE_VISA: 1 << 3,
  CREATE_QUOTATION: 1 << 4,
  VIEW_ALL_QUOTATIONS: 1 << 5,
  VIEW_OWN_QUOTATIONS: 1 << 6,
  APPROVE_QUOTATION: 1 << 7,
  REQUEST_DISCOUNT: 1 << 8,
  APPROVE_DISCOUNT: 1 << 9,
  VIEW_COMMISSIONS: 1 << 10,
  APPROVE_COMMISSIONS: 1 << 11,
  MANAGE_INVOICES: 1 << 12,
  VIEW_AUDIT: 1 << 13,
  READ_ONLY: 1 << 14,
} as const;

export const ROLE_PERMISSIONS: Record<Role, number> = {
  SUPER_ADMIN: Object.values(PERMISSIONS).reduce((a, b) => a | b, 0),
  MANAGER:
    PERMISSIONS.MANAGE_HOTELS |
    PERMISSIONS.MANAGE_TRANSPORT |
    PERMISSIONS.MANAGE_VISA |
    PERMISSIONS.VIEW_ALL_QUOTATIONS |
    PERMISSIONS.APPROVE_QUOTATION |
    PERMISSIONS.APPROVE_DISCOUNT |
    PERMISSIONS.VIEW_COMMISSIONS |
    PERMISSIONS.APPROVE_COMMISSIONS,
  STAFF:
    PERMISSIONS.CREATE_QUOTATION |
    PERMISSIONS.VIEW_OWN_QUOTATIONS |
    PERMISSIONS.REQUEST_DISCOUNT |
    PERMISSIONS.VIEW_COMMISSIONS,
  AGENT:
    PERMISSIONS.CREATE_QUOTATION |
    PERMISSIONS.VIEW_OWN_QUOTATIONS |
    PERMISSIONS.VIEW_COMMISSIONS,
  ACCOUNTS_MANAGER:
    PERMISSIONS.VIEW_ALL_QUOTATIONS |
    PERMISSIONS.VIEW_COMMISSIONS |
    PERMISSIONS.APPROVE_COMMISSIONS |
    PERMISSIONS.MANAGE_INVOICES,
  VIEWER: PERMISSIONS.READ_ONLY | PERMISSIONS.VIEW_ALL_QUOTATIONS,
};

export const INFANT_VISA_RATE = 490;
export const DEFAULT_EXCHANGE_RATE = 74.5;
