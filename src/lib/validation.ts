import { QuotationFormState } from "@/types/quotation-form";

export type FieldStatus = "idle" | "valid" | "invalid";

export function fieldStatus(value: string | number, required = true, touched = false): FieldStatus {
  if (!touched && value === "") return "idle";
  if (required) {
    if (typeof value === "number" ? value < 0 || Number.isNaN(value) : !String(value).trim()) {
      return touched ? "invalid" : "idle";
    }
  }
  return "valid";
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  return /^\+[\d\s-]{10,}$/.test(phone.trim());
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  tabErrors: Record<string, string[]>;
}

export function validateQuotationForm(form: QuotationFormState): ValidationResult {
  const errors: string[] = [];
  const tabErrors: Record<string, string[]> = {
    passengers: [],
    hotels: [],
    transport: [],
    visa: [],
  };

  if (!form.customerName.trim()) tabErrors.passengers.push("Customer Name is required");
  if (!form.customerEmail.trim() || !validateEmail(form.customerEmail)) {
    tabErrors.passengers.push("Valid Customer Email is required");
  }
  if (!validatePhone(form.customerPhone)) tabErrors.passengers.push("Customer Phone is required (+92 ...)");
  if (!validatePhone(form.customerWhatsapp)) tabErrors.passengers.push("Customer WhatsApp is required (+966 ...)");
  if (form.adults < 0) tabErrors.passengers.push("Adults is required");
  if (form.airTicketAdultPkr <= 0) tabErrors.passengers.push("Adult air ticket rate is required");

  form.hotels.forEach((h, i) => {
    if (!h.city) tabErrors.hotels.push(`Hotel ${i + 1}: City is required`);
    if (!h.hotelId) tabErrors.hotels.push(`Hotel ${i + 1}: Hotel Name is required`);
    if (!h.checkIn) tabErrors.hotels.push(`Hotel ${i + 1}: Check-in date is required`);
    if (h.nights < 1) tabErrors.hotels.push(`Hotel ${i + 1}: Nights is required`);
    if (h.bookingMode === "SHARING") {
      if (h.sharingRatePerBed <= 0) {
        tabErrors.hotels.push(`Hotel ${i + 1}: Sharing rate is required`);
      }
    } else {
      let hasRoom = false;
      h.rooms.forEach((r, ri) => {
        if (!r.roomType) tabErrors.hotels.push(`Hotel ${i + 1} Room ${ri + 1}: Room type required`);
        if (r.quantity < 1) tabErrors.hotels.push(`Hotel ${i + 1} Room ${ri + 1}: Quantity required`);
        if (r.roomType && r.ratePerNight > 0) hasRoom = true;
      });
      if (!hasRoom) tabErrors.hotels.push(`Hotel ${i + 1}: At least one private room is required`);
    }
  });

  form.transport.forEach((t, i) => {
    if (!t.routeId) tabErrors.transport.push(`Route ${i + 1}: Route is required`);
    if (!t.vehicleType) tabErrors.transport.push(`Route ${i + 1}: Vehicle is required`);
  });

  const routeIds = form.transport.map((t) => t.routeId).filter(Boolean);
  if (new Set(routeIds).size !== routeIds.length) {
    tabErrors.transport.push("Duplicate routes are not allowed");
  }

  if (!form.visaCategoryId) tabErrors.visa.push("Visa Category is required");

  Object.values(tabErrors).forEach((list) => errors.push(...list));

  return { valid: errors.length === 0, errors, tabErrors };
}
