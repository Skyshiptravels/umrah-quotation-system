import { HotelAdminPayload, HotelFormState, RoomTypeKey } from "@/types/hotel-admin";
import { ROOM_TYPE_META } from "@/types/hotel-admin";

export interface HotelValidationResult {
  valid: boolean;
  errors: string[];
}

function parseRate(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

export function validateHotelForm(form: HotelFormState): HotelValidationResult {
  const errors: string[] = [];

  if (form.name.trim().length < 3) errors.push("Hotel name is required (min 3 characters)");
  if (!form.category) errors.push("Please select a category");
  if (!form.city) errors.push("Please select a city");
  if (form.location.trim().length < 3) errors.push("Location is required (min 3 characters)");
  if (form.distanceLabel.trim().length < 3) errors.push("Distance is required (min 3 characters)");
  if (!form.dateStart) errors.push("Date start is required");
  if (!form.dateEnd) errors.push("Date end is required");
  if (form.dateStart && form.dateEnd && form.dateStart >= form.dateEnd) {
    errors.push("Date start must be before date end");
  }

  if (!form.offersSharing && !form.offersPrivate) {
    errors.push("Enable at least Sharing or Private Rooms");
  }

  if (form.offersSharing) {
    const sharing = parseRate(form.sharingRatePerBed);
    if (Number.isNaN(sharing) || sharing <= 0) {
      errors.push("Sharing rate per bed is required when sharing is enabled");
    }
  }

  if (form.offersPrivate) {
    const enabled = ROOM_TYPE_META.filter(({ key }) => form.enabledTypes[key]);
    if (enabled.length === 0) errors.push("Select at least one private room type");
    let hasPrivateRate = false;
    for (const { key } of enabled) {
      const rate = parseRate(form.privateRoomRates[key]);
      if (!Number.isNaN(rate) && rate > 0) hasPrivateRate = true;
    }
    if (!hasPrivateRate) errors.push("Enter at least one private room rate (full room SAR/night)");
  }

  return { valid: errors.length === 0, errors };
}

export function formToPayload(form: HotelFormState, organizationId: string): HotelAdminPayload {
  const room_rates = ROOM_TYPE_META.filter(
    ({ key }) => form.offersPrivate && form.enabledTypes[key]
  )
    .map(({ key }) => ({
      room_type: key as RoomTypeKey,
      full_room_rate_sar: parseFloat(form.privateRoomRates[key]),
    }))
    .filter((r) => r.full_room_rate_sar > 0);

  const sharingRate = form.offersSharing ? parseFloat(form.sharingRatePerBed) : null;

  return {
    name: form.name.trim(),
    city: form.city,
    category: form.category,
    location: form.location.trim(),
    distance_label: form.distanceLabel.trim(),
    markaziya_status: form.city === "Madinah" && form.markaziyaStatus ? form.markaziyaStatus : null,
    date_start: form.dateStart,
    date_end: form.dateEnd,
    offers_sharing: form.offersSharing,
    offers_private: form.offersPrivate,
    sharing_rate_per_bed: sharingRate,
    room_rates,
    amenities: form.amenities
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
    staff_notes: form.staffNotes.trim() || undefined,
    organization_id: organizationId,
  };
}

export function validatePayload(payload: HotelAdminPayload): HotelValidationResult {
  const errors: string[] = [];
  if (payload.name.length < 3) errors.push("Hotel name is required");
  if (!payload.category) errors.push("Please select a category");
  if (!payload.city) errors.push("Please select a city");
  if (payload.location.length < 3) errors.push("Location is required");
  if (payload.distance_label.length < 3) errors.push("Distance is required");
  if (!payload.date_start || !payload.date_end) errors.push("Date range is required");
  if (payload.date_start >= payload.date_end) errors.push("Date start must be before date end");
  if (!payload.offers_sharing && !payload.offers_private) {
    errors.push("Enable at least Sharing or Private Rooms");
  }
  if (payload.offers_sharing && (!payload.sharing_rate_per_bed || payload.sharing_rate_per_bed <= 0)) {
    errors.push("Sharing rate per bed is required");
  }
  if (payload.offers_private && !payload.room_rates.length) {
    errors.push("At least one private room rate is required");
  }
  return { valid: errors.length === 0, errors };
}
