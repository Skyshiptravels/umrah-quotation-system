"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HOTEL_CATEGORIES,
  HotelFormState,
  ROOM_TYPE_META,
  RoomTypeKey,
  emptyHotelForm,
} from "@/types/hotel-admin";
import { perBedFromFullRoom } from "@/lib/hotel-rate-calculations";
import { formToPayload, validateHotelForm } from "@/lib/hotel-admin-validation";

interface Props {
  open: boolean;
  mode: "add" | "edit";
  initialCity: "Makkah" | "Madinah";
  editHotelId?: string | null;
  organizationId: string;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: () => void;
}

function emptyPrivateRates(): Record<RoomTypeKey, string> {
  return { Single: "", Double: "", Triple: "", Quad: "", Quint: "" };
}

export default function HotelFormModal({
  open,
  mode,
  initialCity,
  editHotelId,
  organizationId,
  apiFetch,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<HotelFormState>(() => emptyHotelForm(initialCity));
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (mode === "add") {
      setForm(emptyHotelForm(initialCity));
      setEditName("");
      return;
    }
    if (!editHotelId) return;

    setLoadingDetail(true);
    apiFetch(`/api/hotels/${editHotelId}`)
      .then((r) => r.json())
      .then((data) => {
        const h = data.hotel;
        const rooms = data.room_types || [];
        const season = data.seasons?.[0];
        const enabledTypes = {} as Record<RoomTypeKey, boolean>;
        const privateRoomRates = emptyPrivateRates();
        for (const { key } of ROOM_TYPE_META) {
          enabledTypes[key] = false;
        }
        for (const r of rooms) {
          const key = r.room_type as RoomTypeKey;
          if (ROOM_TYPE_META.some((m) => m.key === key)) {
            enabledTypes[key] = true;
            privateRoomRates[key] = String(r.base_price_sar);
          }
        }
        setEditName(h.name);
        setForm({
          name: h.name,
          category: h.category || "",
          city: h.city,
          location: h.address || "",
          distanceLabel: h.distance_label || "",
          markaziyaStatus: h.markaziya_status || "",
          dateStart: season?.start_date?.split("T")[0] || "",
          dateEnd: season?.end_date?.split("T")[0] || "",
          offersSharing: h.offers_sharing !== false,
          offersPrivate: h.offers_private !== false,
          sharingRatePerBed: h.sharing_rate_per_bed ? String(Number(h.sharing_rate_per_bed)) : "",
          enabledTypes,
          privateRoomRates,
          amenities: (h.amenities || []).join(", "),
          staffNotes: h.staff_notes || "",
        });
      })
      .catch(() => setError("Failed to load hotel details"))
      .finally(() => setLoadingDetail(false));
  }, [open, mode, editHotelId, initialCity, apiFetch]);

  const enabledKeys = useMemo(
    () => ROOM_TYPE_META.filter(({ key }) => form.enabledTypes[key]).map(({ key }) => key),
    [form.enabledTypes]
  );

  const previewPrivate = useMemo(() => {
    return ROOM_TYPE_META.filter(({ key }) => form.enabledTypes[key] && form.offersPrivate)
      .map(({ key, occupancy }) => {
        const full = parseFloat(form.privateRoomRates[key]);
        if (!full || full <= 0) return null;
        return { key, full, perBed: perBedFromFullRoom(full, occupancy) };
      })
      .filter(Boolean) as { key: RoomTypeKey; full: number; perBed: number }[];
  }, [form.enabledTypes, form.privateRoomRates, form.offersPrivate]);

  function patch(p: Partial<HotelFormState>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function clearForm() {
    setForm(emptyHotelForm(form.city));
    setError("");
  }

  async function handleSave() {
    setError("");
    const validation = validateHotelForm(form);
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      const payload = formToPayload(form, organizationId);
      const url = mode === "edit" && editHotelId ? `/api/hotels/${editHotelId}` : "/api/hotels";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
          <h2 className="text-xl font-bold">
            {mode === "edit" ? `Edit Hotel: ${editName || form.name}` : "Add New Hotel"}
          </h2>
          <button type="button" className="text-gray-400 hover:text-gray-600 text-2xl" onClick={onClose}>
            ×
          </button>
        </div>

        {loadingDetail ? (
          <div className="p-12 text-center text-gray-500">Loading hotel...</div>
        ) : (
          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">✗ {error}</div>
            )}

            <section>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">
                    Hotel Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder="AJWA ZIAFA"
                  />
                </div>
                <div>
                  <label className="label">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => patch({ category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    {HOTEL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input"
                    value={form.city}
                    onChange={(e) =>
                      patch({
                        city: e.target.value as "Makkah" | "Madinah",
                        markaziyaStatus: e.target.value === "Madinah" ? form.markaziyaStatus : "",
                      })
                    }
                  >
                    <option value="Makkah">Makkah</option>
                    <option value="Madinah">Madinah</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    value={form.location}
                    onChange={(e) => patch({ location: e.target.value })}
                    placeholder="MAIN IBRAHIM KHALIL ROAD, MISFILLAH"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">
                    Distance <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    value={form.distanceLabel}
                    onChange={(e) => patch({ distanceLabel: e.target.value })}
                    placeholder='600 M, SHUTTLE SERVICE, "1000 M COOP SHUTTLE"'
                  />
                </div>
                {form.city === "Madinah" && (
                  <div>
                    <label className="label">Markaziya (Madinah)</label>
                    <select
                      className="input"
                      value={form.markaziyaStatus}
                      onChange={(e) =>
                        patch({ markaziyaStatus: e.target.value as "" | "INSIDE" | "OUTSIDE" })
                      }
                    >
                      <option value="">Not specified</option>
                      <option value="OUTSIDE">Outside Markaziya</option>
                      <option value="INSIDE">Inside Markaziya (Premium)</option>
                    </select>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">
                Pricing Models
              </h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.offersSharing}
                      onChange={(e) => patch({ offersSharing: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Sharing (per-bed, budget)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.offersPrivate}
                      onChange={(e) => patch({ offersPrivate: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Private Rooms (full room)</span>
                  </label>
                </div>
                {form.offersSharing && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <label className="label">Sharing rate per bed (SAR/night) *</label>
                    <input
                      className="input max-w-xs"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.sharingRatePerBed}
                      onChange={(e) => patch({ sharingRatePerBed: e.target.value })}
                      placeholder="13"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Guest shares room with other clients. Hotel assigns quad/triple/double.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Date Start <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={form.dateStart}
                      onChange={(e) => patch({ dateStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">
                      Date End <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={form.dateEnd}
                      onChange={(e) => patch({ dateEnd: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </section>

            {form.offersPrivate && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">
                Private Room Rates (full room SAR/night)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {ROOM_TYPE_META.map(({ key, label, occupancy }) => (
                  <label key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={form.enabledTypes[key]}
                      onChange={(e) =>
                        patch({
                          enabledTypes: { ...form.enabledTypes, [key]: e.target.checked },
                        })
                      }
                      className="mt-1"
                    />
                    <span className="text-sm flex-1">
                      {label}
                      {form.enabledTypes[key] && (
                        <input
                          className="input mt-1"
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.privateRoomRates[key]}
                          onChange={(e) =>
                            patch({
                              privateRoomRates: {
                                ...form.privateRoomRates,
                                [key]: e.target.value,
                              },
                            })
                          }
                          placeholder="Full room SAR/night"
                        />
                      )}
                      {form.enabledTypes[key] && form.privateRoomRates[key] && (
                        <span className="text-xs text-gray-500 block mt-0.5">
                          ≈ {perBedFromFullRoom(parseFloat(form.privateRoomRates[key]) || 0, occupancy)} SAR/bed
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>
            )}

            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Amenities (comma-separated)</label>
                  <input
                    className="input"
                    value={form.amenities}
                    onChange={(e) => patch({ amenities: e.target.value })}
                    placeholder="WiFi, Air-Con, Breakfast"
                  />
                </div>
                <div>
                  <label className="label">Staff Notes</label>
                  <input
                    className="input"
                    value={form.staffNotes}
                    onChange={(e) => patch({ staffNotes: e.target.value })}
                    placeholder="Budget-friendly, good value"
                  />
                </div>
              </div>
            </section>

            <section className="bg-gray-50 rounded-xl p-4 border">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Display Preview</h3>
              <p className="font-semibold text-primary-800">
                {form.name || "Hotel Name"} {form.category?.includes("STAR") ? "⭐" : ""}
              </p>
              <p className="text-sm text-gray-600">
                {form.location || "Location"}, {form.distanceLabel || "Distance"}
              </p>
              {form.dateStart && form.dateEnd && (
                <p className="text-sm text-gray-600">
                  Available:{" "}
                  {new Date(form.dateStart + "T00:00:00").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  to{" "}
                  {new Date(form.dateEnd + "T00:00:00").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
              <div className="mt-2 space-y-1 text-sm">
                {form.offersSharing && form.sharingRatePerBed && (
                  <p className="text-blue-800">
                    Sharing: {form.sharingRatePerBed} SAR/bed per night
                  </p>
                )}
                {previewPrivate.length === 0 && !form.sharingRatePerBed ? (
                  <p className="text-gray-400">Enter rates to see preview</p>
                ) : (
                  previewPrivate.map(({ key, full, perBed }) => (
                    <p key={key}>
                      Private {key}: {full} SAR/night ({perBed} SAR/bed)
                    </p>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex flex-wrap justify-end gap-3 rounded-b-xl">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn-secondary" onClick={clearForm} disabled={loading}>
            Clear Form
          </button>
          <button type="button" className="btn-primary px-8" onClick={handleSave} disabled={loading || loadingDetail}>
            {loading ? "Saving..." : mode === "edit" ? "Update Hotel" : "Save Hotel"}
          </button>
        </div>
      </div>
    </div>
  );
}
