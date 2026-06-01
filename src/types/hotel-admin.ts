export type HotelCity = "Makkah" | "Madinah";
export type MarkaziyaStatus = "INSIDE" | "OUTSIDE" | "";

export type RoomTypeKey = "Single" | "Double" | "Triple" | "Quad" | "Quint";

export interface RoomRateInput {
  room_type: RoomTypeKey;
  full_room_rate_sar: number;
}

export interface HotelAdminPayload {
  name: string;
  city: HotelCity;
  category: string;
  location: string;
  distance_label: string;
  markaziya_status?: MarkaziyaStatus | null;
  date_start: string;
  date_end: string;
  offers_sharing: boolean;
  offers_private: boolean;
  sharing_rate_per_bed?: number | null;
  room_rates: RoomRateInput[];
  amenities?: string[];
  staff_notes?: string;
  organization_id?: string;
}

export interface HotelFormState {
  name: string;
  category: string;
  city: HotelCity;
  location: string;
  distanceLabel: string;
  markaziyaStatus: MarkaziyaStatus;
  dateStart: string;
  dateEnd: string;
  offersSharing: boolean;
  offersPrivate: boolean;
  sharingRatePerBed: string;
  enabledTypes: Record<RoomTypeKey, boolean>;
  privateRoomRates: Record<RoomTypeKey, string>;
  amenities: string;
  staffNotes: string;
}

export const HOTEL_CATEGORIES = [
  "ECONOMY",
  "ECONOMY_PLUS",
  "BUDGET",
  "1-STAR",
  "2-STAR",
  "3-STAR",
  "4-STAR",
  "5-STAR",
  "BUILDING",
] as const;

export const ROOM_TYPE_META: { key: RoomTypeKey; label: string; occupancy: number }[] = [
  { key: "Single", label: "Single (1-bed)", occupancy: 1 },
  { key: "Double", label: "Double (2-bed)", occupancy: 2 },
  { key: "Triple", label: "Triple (3-bed)", occupancy: 3 },
  { key: "Quad", label: "Quad (4-bed)", occupancy: 4 },
  { key: "Quint", label: "Quint (5-bed)", occupancy: 5 },
];

export function emptyHotelForm(city: HotelCity = "Makkah"): HotelFormState {
  return {
    name: "",
    category: "",
    city,
    location: "",
    distanceLabel: "",
    markaziyaStatus: "",
    dateStart: "",
    dateEnd: "",
    offersSharing: true,
    offersPrivate: true,
    sharingRatePerBed: "",
    enabledTypes: {
      Single: true,
      Double: true,
      Triple: true,
      Quad: true,
      Quint: false,
    },
    privateRoomRates: { Single: "", Double: "", Triple: "", Quad: "", Quint: "" },
    amenities: "",
    staffNotes: "",
  };
}
