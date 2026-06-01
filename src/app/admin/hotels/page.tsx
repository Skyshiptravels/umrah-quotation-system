"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DeleteHotelDialog from "@/components/admin/DeleteHotelDialog";
import HotelFormModal from "@/components/admin/HotelFormModal";
import HotelList, { HotelListItem } from "@/components/admin/HotelList";

type CityTab = "Makkah" | "Madinah";

export default function AdminHotelsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [activeCity, setActiveCity] = useState<CityTab>("Makkah");
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editHotelId, setEditHotelId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HotelListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadHotels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ city: activeCity, limit: "200" });
      const res = await apiFetch(`/api/hotels?${params}`);
      const data = await res.json();
      setHotels(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, activeCity]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    loadHotels();
  }, [user, router, loadHotels]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredHotels = useMemo(() => {
    if (!search.trim()) return hotels;
    const q = search.toLowerCase();
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.category || "").toLowerCase().includes(q) ||
        (h.address || "").toLowerCase().includes(q) ||
        (h.distance_label || "").toLowerCase().includes(q) ||
        String(h.distance_m || "").includes(q)
    );
  }, [hotels, search]);

  function openAdd() {
    setFormMode("add");
    setEditHotelId(null);
    setFormOpen(true);
  }

  function openEdit(hotelId: string) {
    setFormMode("edit");
    setEditHotelId(hotelId);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/hotels/${deleteTarget.hotel_id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setToast("✓ Hotel deleted successfully!");
      setDeleteTarget(null);
      loadHotels();
    } catch (err) {
      setToast(`✗ ${err instanceof Error ? err.message : "Delete failed"}`);
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotel Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage hotels for Makkah and Madinah</p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={openAdd}>
          + Add Hotel
        </button>
      </div>

      {toast && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            toast.startsWith("✓") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          className="input max-w-md"
          placeholder="🔍 Search hotel by name, category, distance..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 border-b pb-0">
        {(["Makkah", "Madinah"] as CityTab[]).map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => setActiveCity(city)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeCity === city
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {city}
            {!loading && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {city === activeCity ? filteredHotels.length : "…"}
              </span>
            )}
          </button>
        ))}
      </div>

      <HotelList
        hotels={filteredHotels}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <HotelFormModal
        open={formOpen}
        mode={formMode}
        initialCity={activeCity}
        editHotelId={editHotelId}
        organizationId={user.organization_id}
        apiFetch={apiFetch}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setToast(formMode === "edit" ? "✓ Hotel updated successfully!" : "✓ Hotel added successfully!");
          loadHotels();
        }}
      />

      <DeleteHotelDialog
        hotelName={deleteTarget?.name || ""}
        open={!!deleteTarget}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
