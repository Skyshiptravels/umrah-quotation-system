import {
  createEmptyHotel,
  HotelBlock,
  HotelRoomLine,
  QuotationFormState,
  SuggestedUpgrades,
  TransportLine,
} from "@/types/quotation-form";

export interface QuotationApiHotelRow {
  id: string;
  hotel_id: string;
  hotel_name?: string;
  city: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  view_modifier: string;
  meal_plan: string;
  booking_mode: string;
  sharing_pax: number;
  room_type_1: string | null;
  quantity_1: number;
  room_type_2: string | null;
  quantity_2: number;
  subtotal_sar: string | number;
}

export interface QuotationApiTransportRow {
  id: string;
  route_id: string;
  route_name?: string;
  vehicle_type: string;
  total_cost_sar: string | number;
  quantity_pax?: number;
}

export interface QuotationApiVisaRow {
  visa_category_id: string;
}

export interface QuotationApiDetail {
  quotation: Record<string, unknown>;
  hotels: QuotationApiHotelRow[];
  transport: QuotationApiTransportRow[];
  visas: QuotationApiVisaRow[];
}

function defaultUpgrades(raw: unknown): SuggestedUpgrades {
  const u = (raw || {}) as Partial<SuggestedUpgrades>;
  return {
    roomUpgradeMakkah: Number(u.roomUpgradeMakkah) || 0,
    roomUpgradeMadinah: Number(u.roomUpgradeMadinah) || 0,
    mealPlan: (u.mealPlan as SuggestedUpgrades["mealPlan"]) || "RO",
    mealPlanPremium: Number(u.mealPlanPremium) || 0,
    umrahTraining: Boolean(u.umrahTraining),
    meetGreet: Boolean(u.meetGreet),
    medicalInsurance: Boolean(u.medicalInsurance),
    emergencyEvacuation: Boolean(u.emergencyEvacuation),
  };
}

function groupHotelRows(rows: QuotationApiHotelRow[]): HotelBlock[] {
  const groups = new Map<string, QuotationApiHotelRow[]>();

  for (const row of rows) {
    const key = [
      row.hotel_id,
      row.city,
      row.check_in_date,
      row.nights,
      row.booking_mode || "PRIVATE",
      row.view_modifier,
    ].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const blocks: HotelBlock[] = [];

  for (const groupRows of Array.from(groups.values())) {
    const first = groupRows[0];
    const city = (first.city === "Madinah" ? "Madinah" : "Makkah") as "Makkah" | "Madinah";
    const bookingMode =
      first.booking_mode === "SHARING" ? "SHARING" : ("PRIVATE" as const);

    const rooms: HotelRoomLine[] = [];

    if (bookingMode === "PRIVATE") {
      for (const row of groupRows) {
        if (
          row.room_type_1 &&
          row.quantity_1 > 0 &&
          row.room_type_1 !== "Sharing"
        ) {
          rooms.push({
            id: crypto.randomUUID(),
            roomType: row.room_type_1,
            quantity: row.quantity_1,
            ratePerNight: 0,
          });
        }
        if (row.room_type_2 && row.quantity_2 > 0) {
          rooms.push({
            id: crypto.randomUUID(),
            roomType: row.room_type_2,
            quantity: row.quantity_2,
            ratePerNight: 0,
          });
        }
      }
    }

    if (rooms.length === 0 && bookingMode === "PRIVATE") {
      rooms.push({
        id: crypto.randomUUID(),
        roomType: "Quad",
        quantity: 1,
        ratePerNight: 0,
      });
    }

    blocks.push({
      id: crypto.randomUUID(),
      city,
      hotelId: first.hotel_id,
      bookingMode,
      sharingRatePerBed: 0,
      checkIn:
        typeof first.check_in_date === "string"
          ? first.check_in_date.split("T")[0]
          : String(first.check_in_date),
      nights: Number(first.nights) || 1,
      viewModifier: (first.view_modifier || "NONE") as HotelBlock["viewModifier"],
      rooms,
      checkInLocked: false,
    });
  }

  return blocks.length ? blocks : [createEmptyHotel("Makkah")];
}

export function apiDetailToFormState(detail: QuotationApiDetail): QuotationFormState {
  const q = detail.quotation;
  let draftJson = q.draft_form_json as QuotationFormState | string | null | undefined;
  if (typeof draftJson === "string") {
    try {
      draftJson = JSON.parse(draftJson) as QuotationFormState;
    } catch {
      draftJson = null;
    }
  }
  if (draftJson && typeof draftJson === "object" && draftJson.customerName !== undefined) {
    return {
      ...initialFormStateFromDraft(draftJson),
      hotels: draftJson.hotels?.length ? draftJson.hotels : groupHotelRows(detail.hotels),
      transport: draftJson.transport?.length
        ? draftJson.transport
        : mapTransport(detail.transport),
    };
  }

  const vendorRaw = q.vendor_cost_breakdown as Record<string, { vendor_id?: string }> | null;
  return {
    clientId: String(q.client_id || ""),
    customerName: String(q.customer_name || ""),
    customerEmail: String(q.customer_email || ""),
    customerPhone: String(q.customer_phone || ""),
    customerWhatsapp: String(q.customer_whatsapp || ""),
    adults: Number(q.adults) || 0,
    childrenWithBed: Number(q.children_with_bed) || 0,
    childrenWithoutBed: Number(q.children_without_bed) || 0,
    infants: Number(q.infants) || 0,
    airTicketAdultPkr: Number(q.air_ticket_adult_pkr) || 0,
    airTicketChildPkr: Number(q.air_ticket_child_pkr) || 0,
    airTicketInfantPkr: Number(q.air_ticket_infant_pkr) || 0,
    hotels: groupHotelRows(detail.hotels),
    upgrades: defaultUpgrades(q.suggested_upgrades),
    transport: mapTransport(detail.transport),
    visaCategoryId: detail.visas[0]?.visa_category_id || "",
    hotelVendorId: vendorRaw?.hotel?.vendor_id || "",
    transportVendorId: vendorRaw?.transport?.vendor_id || "",
    visaVendorId: vendorRaw?.visa?.vendor_id || "",
  };
}

function initialFormStateFromDraft(draft: QuotationFormState): QuotationFormState {
  return {
    ...draft,
    upgrades: defaultUpgrades(draft.upgrades),
  };
}

function mapTransport(rows: QuotationApiTransportRow[]): TransportLine[] {
  if (!rows.length) {
    return [{ id: crypto.randomUUID(), routeId: "", vehicleType: "", costSar: 0, capacity: 0 }];
  }
  return rows.map((t) => ({
    id: crypto.randomUUID(),
    routeId: t.route_id,
    vehicleType: t.vehicle_type,
    costSar: Number(t.total_cost_sar) || 0,
    capacity: Number(t.quantity_pax) || 0,
  }));
}

export interface QuotationSavePayload {
  client_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_whatsapp: string;
  adults: number;
  children_with_bed: number;
  children_without_bed: number;
  infants: number;
  air_ticket_adult_pkr: number;
  air_ticket_child_pkr: number;
  air_ticket_infant_pkr: number;
  flights_cost_pkr: number;
  suggested_upgrades: SuggestedUpgrades;
  upgrades_cost_sar: number;
  transfers_cost_sar: number;
  hotels: Array<{
    hotel_id: string;
    city: string;
    check_in_date: string;
    check_out_date: string;
    nights: number;
    view_modifier: string;
    meal_plan: string;
    booking_mode: string;
    sharing_pax: number;
    room_type_1?: string | null;
    quantity_1?: number;
    room_type_2?: string | null;
    quantity_2?: number;
  }>;
  transport: Array<{ route_id: string; vehicle_type: string }>;
  visa_category_id: string;
  vendor_cost_breakdown?: Record<string, unknown> | null;
  draft?: boolean;
  draft_form?: QuotationFormState;
}

export function formStateToSavePayload(
  form: QuotationFormState,
  previewUpgradesSar: number,
  options?: { draft?: boolean; vendor_cost_breakdown?: Record<string, unknown> | null }
): QuotationSavePayload {
  const airTotal =
    form.adults * form.airTicketAdultPkr +
    (form.childrenWithBed + form.childrenWithoutBed) * form.airTicketChildPkr +
    form.infants * form.airTicketInfantPkr;

  const mealPlan = form.upgrades.mealPlan === "RO" ? "RO" : "BB";
  const sharingPax = form.adults + form.childrenWithBed;
  const hotelPayloads: QuotationSavePayload["hotels"] = [];

  for (const hotel of form.hotels) {
    if (!hotel.hotelId) continue;
    const checkOut = new Date(hotel.checkIn + "T00:00:00");
    checkOut.setDate(checkOut.getDate() + hotel.nights);
    const checkOutStr = checkOut.toISOString().split("T")[0];

    if (hotel.bookingMode === "SHARING") {
      hotelPayloads.push({
        hotel_id: hotel.hotelId,
        city: hotel.city,
        check_in_date: hotel.checkIn,
        check_out_date: checkOutStr,
        nights: hotel.nights,
        view_modifier: hotel.viewModifier,
        meal_plan: mealPlan,
        booking_mode: "SHARING",
        sharing_pax: sharingPax,
      });
      continue;
    }

    for (let i = 0; i < hotel.rooms.length; i += 2) {
      const r1 = hotel.rooms[i];
      const r2 = hotel.rooms[i + 1];
      if (!r1?.roomType || !r1.quantity) continue;
      hotelPayloads.push({
        hotel_id: hotel.hotelId,
        city: hotel.city,
        check_in_date: hotel.checkIn,
        check_out_date: checkOutStr,
        nights: hotel.nights,
        view_modifier: hotel.viewModifier,
        meal_plan: mealPlan,
        booking_mode: "PRIVATE",
        sharing_pax: 0,
        room_type_1: r1.roomType,
        quantity_1: r1.quantity,
        room_type_2: r2?.roomType || null,
        quantity_2: r2?.quantity || 0,
      });
    }
  }

  return {
    client_id: form.clientId || null,
    customer_name: form.customerName,
    customer_email: form.customerEmail,
    customer_phone: form.customerPhone,
    customer_whatsapp: form.customerWhatsapp,
    adults: form.adults,
    children_with_bed: form.childrenWithBed,
    children_without_bed: form.childrenWithoutBed,
    infants: form.infants,
    air_ticket_adult_pkr: form.airTicketAdultPkr,
    air_ticket_child_pkr: form.airTicketChildPkr,
    air_ticket_infant_pkr: form.airTicketInfantPkr,
    flights_cost_pkr: airTotal,
    suggested_upgrades: form.upgrades,
    upgrades_cost_sar: previewUpgradesSar,
    transfers_cost_sar: 0,
    hotels: hotelPayloads,
    transport: form.transport
      .filter((t) => t.routeId && t.vehicleType)
      .map((t) => ({ route_id: t.routeId, vehicle_type: t.vehicleType })),
    visa_category_id: form.visaCategoryId,
    vendor_cost_breakdown: options?.vendor_cost_breakdown ?? null,
    draft: options?.draft,
    draft_form: options?.draft ? form : undefined,
  };
}
