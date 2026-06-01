"use client";

import FormField from "@/components/quotation/FormField";
import { addDays, oppositeCity } from "@/lib/quotation-form-calculations";
import {
  HotelBlock,
  HotelOption,
  HotelRoomLine,
  QuotationFormState,
  RoomTypeOption,
  SuggestedUpgrades,
} from "@/types/quotation-form";

interface Props {
  form: QuotationFormState;
  hotels: HotelOption[];
  roomTypesByHotel: Record<string, RoomTypeOption[]>;
  onChange: (patch: Partial<QuotationFormState>) => void;
  onLoadRooms: (hotelId: string) => Promise<void>;
}

const MEAL_PLANS = [
  { id: "RO", label: "Room Only (RO)", premium: 0 },
  { id: "BB", label: "Bed & Breakfast (BB)", premium: 50 },
  { id: "HB", label: "Half Board (HB)", premium: 80 },
  { id: "FB", label: "Full Board (FB)", premium: 120 },
];

function formatSeason(start?: string | null, end?: string | null): string {
  if (!start || !end) return "";
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  return `${fmt(start)} to ${fmt(end)}`;
}

function markaziyaLabel(status?: "INSIDE" | "OUTSIDE" | null): string {
  if (status === "INSIDE") return "📍 INSIDE MARKAZIYA (Premium!)";
  if (status === "OUTSIDE") return "📍 OUTSIDE MARKAZIYA (Quiet, Budget)";
  return "";
}

function hotelOptionLabel(h: HotelOption): string {
  const parts = [h.name];
  if (h.distance_m) parts.push(`${h.distance_m}M`);
  else if (h.staff_notes?.includes("SHUTTLE") || h.distance_label?.includes("SHUTTLE")) {
    parts.push("Shuttle");
  }
  if (h.markaziya_status === "INSIDE") parts.push("Inside Markaziya");
  if (h.offers_sharing && h.offers_private) parts.push("Sharing+Private");
  else if (h.offers_sharing) parts.push("Sharing");
  else if (h.offers_private) parts.push("Private");
  if (h.category?.includes("STAR")) parts.push("⭐");
  return parts.join(" — ");
}

function defaultBookingMode(h: HotelOption): "SHARING" | "PRIVATE" {
  if (h.offers_private && !h.offers_sharing) return "PRIVATE";
  if (h.offers_sharing && !h.offers_private) return "SHARING";
  return "PRIVATE";
}

function distanceDisplay(hotel: HotelOption): string | null {
  if (hotel.distance_m) {
    return `${hotel.distance_m} M from Masjid Al-Haram`;
  }
  const note = hotel.staff_notes || "";
  const shuttle = note.match(/SHUTTLE SERVICE[^.]*/i);
  if (shuttle) return shuttle[0];
  const range = note.match(/^[\d-]+ M[^.]*/);
  if (range) return range[0];
  return null;
}

function pricingLabel(model?: string | null): string {
  if (model === "ROOM") return "Room Basis (full room rate)";
  if (model === "SHARING") return "Sharing (per-bed rates)";
  return "";
}

function HotelInfoCard({ hotel, rooms }: { hotel: HotelOption; rooms: RoomTypeOption[] }) {
  const quad = rooms.find((r) => r.room_type === "Quad");
  const dist = distanceDisplay(hotel);
  const isPremium =
    hotel.category === "5_STAR" ||
    hotel.category === "5-STAR" ||
    hotel.category === "4-STAR";

  return (
    <div className="md:col-span-2 rounded-lg border border-primary-100 bg-primary-50/50 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-primary-900">{hotel.name}</p>
        {hotel.category && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isPremium ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
            }`}
          >
            {hotel.category}
          </span>
        )}
        {hotel.pricing_model && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            {hotel.offers_sharing && hotel.offers_private
              ? "Sharing + Private"
              : hotel.offers_sharing
                ? "Sharing"
                : "Private"}
          </span>
        )}
      </div>
      {dist ? <p className="text-sm text-gray-700">{dist}</p> : null}
      {hotel.markaziya_status ? (
        <p className="text-sm font-medium text-primary-800">{markaziyaLabel(hotel.markaziya_status)}</p>
      ) : null}
      {hotel.pricing_model ? (
        <p className="text-xs text-gray-600">{pricingLabel(hotel.pricing_model)}</p>
      ) : null}
      {hotel.address ? <p className="text-xs text-gray-600">{hotel.address}</p> : null}
      {quad ? (
        <p className="text-sm text-gray-800">
          Private Quad from <strong>{quad.base_price_sar} SAR/night</strong>
        </p>
      ) : null}
      {hotel.offers_sharing && hotel.sharing_rate_per_bed ? (
        <p className="text-sm text-gray-800">
          Sharing from <strong>{hotel.sharing_rate_per_bed} SAR/bed/night</strong>
        </p>
      ) : null}
      {hotel.season_start && hotel.season_end ? (
        <p className="text-xs text-gray-500">Available: {formatSeason(hotel.season_start, hotel.season_end)}</p>
      ) : null}
      {hotel.amenities && hotel.amenities.length > 0 ? (
        <p className="text-xs text-gray-600">Amenities: {hotel.amenities.join(", ")}</p>
      ) : null}
      {hotel.staff_notes ? (
        <p className="text-xs italic text-gray-500">{hotel.staff_notes.split(". ").slice(1).join(". ") || hotel.staff_notes}</p>
      ) : null}
    </div>
  );
}

export default function HotelsTab({ form, hotels, roomTypesByHotel, onChange, onLoadRooms }: Props) {
  function updateHotel(index: number, patch: Partial<HotelBlock>) {
    const next = [...form.hotels];
    next[index] = { ...next[index], ...patch };
    onChange({ hotels: next });
  }

  function addHotel() {
    const last = form.hotels[form.hotels.length - 1];
    const city = oppositeCity(last?.city || "Makkah");
    const checkIn = last ? addDays(last.checkIn, last.nights) : new Date().toISOString().split("T")[0];
    onChange({
      hotels: [
        ...form.hotels,
        {
          id: crypto.randomUUID(),
          city,
          hotelId: "",
          bookingMode: "PRIVATE",
          sharingRatePerBed: 0,
          checkIn,
          nights: 4,
          viewModifier: city === "Makkah" ? "HARAM_VIEW" : "NONE",
          rooms: [{ id: crypto.randomUUID(), roomType: "Quad", quantity: 1, ratePerNight: 0 }],
          checkInLocked: true,
        },
      ],
    });
  }

  function addRoom(hotelIndex: number) {
    const h = form.hotels[hotelIndex];
    updateHotel(hotelIndex, {
      rooms: [
        ...h.rooms,
        { id: crypto.randomUUID(), roomType: "Triple", quantity: 1, ratePerNight: 0 },
      ],
    });
  }

  function updateRoom(hotelIndex: number, roomIndex: number, patch: Partial<HotelRoomLine>) {
    const h = form.hotels[hotelIndex];
    const rooms = [...h.rooms];
    rooms[roomIndex] = { ...rooms[roomIndex], ...patch };
    updateHotel(hotelIndex, { rooms });
  }

  function updateUpgrades(patch: Partial<SuggestedUpgrades>) {
    onChange({ upgrades: { ...form.upgrades, ...patch } });
  }

  return (
    <div className="space-y-6">
      {form.hotels.map((hotel, hi) => {
        const cityHotels = hotels.filter((h) => h.city === hotel.city);
        const rooms = roomTypesByHotel[hotel.hotelId] || [];
        const selectedHotel = cityHotels.find((h) => h.hotel_id === hotel.hotelId);

        return (
          <div key={hotel.id} className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
            <h3 className="font-semibold text-primary-800">Hotel {hi + 1}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="City" required tooltip="Select Makkah or Madinah">
                <select
                  className="input"
                  value={hotel.city}
                  disabled={hotel.checkInLocked}
                  onChange={(e) =>
                    updateHotel(hi, {
                      city: e.target.value as "Makkah" | "Madinah",
                      hotelId: "",
                    })
                  }
                >
                  <option value="Makkah">Makkah</option>
                  <option value="Madinah">Madinah</option>
                </select>
              </FormField>

              <FormField label="Hotel Name" required>
                <select
                  className="input"
                  value={hotel.hotelId}
                  onChange={async (e) => {
                    const id = e.target.value;
                    const h = cityHotels.find((x) => x.hotel_id === id);
                    if (h) {
                      updateHotel(hi, {
                        hotelId: id,
                        bookingMode: defaultBookingMode(h),
                        sharingRatePerBed: Number(h.sharing_rate_per_bed) || 0,
                      });
                      await onLoadRooms(id);
                    } else {
                      updateHotel(hi, { hotelId: "" });
                    }
                  }}
                >
                  <option value="">Select hotel</option>
                  {cityHotels.map((h) => (
                    <option key={h.hotel_id} value={h.hotel_id}>
                      {hotelOptionLabel(h)}
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedHotel && <HotelInfoCard hotel={selectedHotel} rooms={rooms} />}

              {selectedHotel && selectedHotel.offers_sharing && selectedHotel.offers_private && (
                <div className="md:col-span-2">
                  <FormField label="Booking Type" required>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={hotel.bookingMode === "PRIVATE"}
                          onChange={() => updateHotel(hi, { bookingMode: "PRIVATE" })}
                        />
                        <span className="text-sm">Private Rooms (your group only)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={hotel.bookingMode === "SHARING"}
                          onChange={() => updateHotel(hi, { bookingMode: "SHARING" })}
                        />
                        <span className="text-sm">
                          Sharing ({selectedHotel.sharing_rate_per_bed} SAR/bed/night)
                        </span>
                      </label>
                    </div>
                  </FormField>
                </div>
              )}

              {selectedHotel?.offers_sharing && !selectedHotel?.offers_private && (
                <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                  Sharing only — {selectedHotel.sharing_rate_per_bed} SAR/bed ×{" "}
                  {form.adults + form.childrenWithBed} guests with bed × {hotel.nights} nights
                </div>
              )}

              {hotel.bookingMode === "SHARING" && selectedHotel && (
                <div className="md:col-span-2 bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-800">
                  Estimated sharing cost:{" "}
                  <strong>
                    {(
                      (selectedHotel.sharing_rate_per_bed || 0) *
                      (form.adults + form.childrenWithBed) *
                      hotel.nights
                    ).toLocaleString()}{" "}
                    SAR
                  </strong>{" "}
                  (before view modifier)
                </div>
              )}

              <FormField label="Check-in Date" required tooltip="Date when guests arrive at hotel">
                <input
                  className="input"
                  type="date"
                  value={hotel.checkIn}
                  readOnly={hotel.checkInLocked}
                  onChange={(e) => updateHotel(hi, { checkIn: e.target.value })}
                />
              </FormField>

              <FormField label="No. of Nights" required tooltip="How many nights staying at this hotel">
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={30}
                  value={hotel.nights}
                  onChange={(e) => updateHotel(hi, { nights: parseInt(e.target.value) || 1 })}
                />
              </FormField>

              {hotel.city === "Makkah" && (
                <FormField label="View Modifier">
                  <select
                    className="input"
                    value={hotel.viewModifier}
                    onChange={(e) =>
                      updateHotel(hi, {
                        viewModifier: e.target.value as HotelBlock["viewModifier"],
                      })
                    }
                  >
                    <option value="NONE">Standard</option>
                    <option value="HARAM_VIEW">Haram View (+200 SAR)</option>
                    <option value="KABA_VIEW">Kaba View (+400 SAR)</option>
                  </select>
                </FormField>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Room Selection</p>
              {hotel.bookingMode === "SHARING" ? (
                <p className="text-sm text-gray-500 italic">
                  Sharing mode — no private room selection needed. Cost is per bed × guests with bed.
                </p>
              ) : (
              <>
              {hotel.rooms.map((room, ri) => (
                <div key={room.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg">
                  <FormField label="Room Type" required tooltip="Select based on passenger count and comfort level">
                    <select
                      className="input"
                      value={room.roomType}
                      onChange={(e) => {
                        const rt = rooms.find((r) => r.room_type === e.target.value);
                        updateRoom(hi, ri, {
                          roomType: e.target.value,
                          ratePerNight: rt ? Number(rt.base_price_sar) : 0,
                        });
                      }}
                    >
                      <option value="">Select room</option>
                      {rooms.map((r) => (
                        <option key={r.room_type} value={r.room_type}>
                          {r.room_type} ({r.base_price_sar} SAR)
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="No. of Rooms" required>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={10}
                      value={room.quantity}
                      onChange={(e) =>
                        updateRoom(hi, ri, { quantity: parseInt(e.target.value) || 1 })
                      }
                    />
                  </FormField>
                  <FormField label="Rate">
                    <input
                      className="input bg-gray-100"
                      readOnly
                      value={room.ratePerNight ? `${room.ratePerNight} SAR/night` : "—"}
                    />
                  </FormField>
                  {room.ratePerNight > 0 && (
                    <p className="md:col-span-3 text-xs text-green-700">
                      Room Added: {room.quantity}× {room.roomType} ({room.ratePerNight} SAR/night ×{" "}
                      {hotel.nights} nights ={" "}
                      {(room.ratePerNight * hotel.nights * room.quantity).toLocaleString()} SAR)
                    </p>
                  )}
                </div>
              ))}
              <button type="button" className="btn-secondary text-sm" onClick={() => addRoom(hi)}>
                + Add Another Room Type
              </button>
              </>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" className="btn-secondary" onClick={addHotel}>
        + Add Next Hotel
      </button>

      <div className="border rounded-xl p-5 bg-amber-50 border-amber-100 space-y-4">
        <h3 className="font-semibold">📌 Suggested Upgrades</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Makkah Room Upgrade (SAR/night)">
            <select
              className="input"
              value={form.upgrades.roomUpgradeMakkah}
              onChange={(e) => updateUpgrades({ roomUpgradeMakkah: parseInt(e.target.value) })}
            >
              {[0, 50, 100, 150, 200].map((v) => (
                <option key={v} value={v}>{v === 0 ? "None" : `+${v} SAR`}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Madinah Room Upgrade (SAR/night)">
            <select
              className="input"
              value={form.upgrades.roomUpgradeMadinah}
              onChange={(e) => updateUpgrades({ roomUpgradeMadinah: parseInt(e.target.value) })}
            >
              {[0, 50, 100, 150, 200].map((v) => (
                <option key={v} value={v}>{v === 0 ? "None" : `+${v} SAR`}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Meal Plan Upgrade">
            <select
              className="input"
              value={form.upgrades.mealPlan}
              onChange={(e) => {
                const mp = MEAL_PLANS.find((m) => m.id === e.target.value);
                updateUpgrades({
                  mealPlan: e.target.value as SuggestedUpgrades["mealPlan"],
                  mealPlanPremium: mp?.premium || 0,
                });
              }}
            >
              {MEAL_PLANS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} {m.premium ? `(+${m.premium} SAR/room/night)` : ""}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            ["umrahTraining", "Umrah Training (1 hour) — 500 SAR"],
            ["meetGreet", "Airport Meet & Greet — 300 SAR"],
            ["medicalInsurance", "Medical Insurance — 200 SAR/person"],
            ["emergencyEvacuation", "Emergency Evacuation — 100 SAR/person"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.upgrades[key as keyof SuggestedUpgrades] as boolean}
                onChange={(e) => updateUpgrades({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
