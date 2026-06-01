"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isConfigAdminRole } from "@/lib/admin-access";

interface RouteRow {
  id: string;
  name: string;
  start_city: string;
  end_city: string;
  distance_km: string | number | null;
}

interface RateRow {
  id: string;
  route_id: string;
  route_name: string;
  vehicle_type: string;
  price_sar: number;
  is_sharing: boolean;
  capacity_pax?: number;
}

interface VehicleRow {
  id: string;
  vehicle_type: string;
  capacity_pax: number;
}

export default function TransportAdminPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"routes" | "rates" | "vehicles">("routes");
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [routeForm, setRouteForm] = useState<Partial<RouteRow> | null>(null);
  const [rateForm, setRateForm] = useState<{
    id?: string;
    route_id: string;
    vehicle_type: string;
    price_sar: number;
    is_sharing: boolean;
    capacity_pax?: number;
  } | null>(null);
  const [vehicleForm, setVehicleForm] = useState<{ vehicle_type: string; capacity_pax: number } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, ra, v] = await Promise.all([
        apiFetch("/api/admin/transport/routes").then((res) => res.json()),
        apiFetch("/api/admin/transport/rates").then((res) => res.json()),
        apiFetch("/api/admin/transport/vehicles").then((res) => res.json()),
      ]);
      setRoutes(r.data || []);
      setRates(ra.data || []);
      setVehicles(v.data || []);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!user || !isConfigAdminRole(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveRoute() {
    if (!routeForm?.name || !routeForm.start_city || !routeForm.end_city) return;
    const isEdit = Boolean(routeForm.id);
    const res = await apiFetch(
      isEdit ? `/api/admin/transport/routes/${routeForm.id}` : "/api/admin/transport/routes",
      {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(routeForm),
      }
    );
    if (!res.ok) {
      const d = await res.json();
      setToast(d.error || "Failed to save route");
      return;
    }
    setRouteForm(null);
    setToast("Route saved");
    void load();
  }

  async function deleteRoute(id: string) {
    if (!confirm("Delete this route and its rates?")) return;
    const res = await apiFetch(`/api/admin/transport/routes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setToast(d.error || "Delete failed");
      return;
    }
    setToast("Route deleted");
    void load();
  }

  async function saveRate() {
    if (!rateForm?.route_id || !rateForm.vehicle_type) return;
    const res = await apiFetch(
      rateForm.id ? `/api/admin/transport/rates/${rateForm.id}` : "/api/admin/transport/rates",
      {
        method: rateForm.id ? "PUT" : "POST",
        body: JSON.stringify(rateForm),
      }
    );
    if (!res.ok) {
      const d = await res.json();
      setToast(d.error || "Failed to save rate");
      return;
    }
    setRateForm(null);
    setToast("Rate saved");
    void load();
  }

  async function deleteRate(id: string) {
    if (!confirm("Delete this rate?")) return;
    await apiFetch(`/api/admin/transport/rates/${id}`, { method: "DELETE" });
    setToast("Rate deleted");
    void load();
  }

  async function saveVehicle() {
    if (!vehicleForm?.vehicle_type || !vehicleForm.capacity_pax) return;
    const res = await apiFetch("/api/admin/transport/vehicles", {
      method: "POST",
      body: JSON.stringify(vehicleForm),
    });
    if (!res.ok) {
      const d = await res.json();
      setToast(d.error || "Failed to save vehicle");
      return;
    }
    setVehicleForm(null);
    setToast("Vehicle saved");
    void load();
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-primary-600 text-sm hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold">Transport Management</h1>
      </div>

      {toast && (
        <div className="mb-4 bg-green-50 text-green-800 px-4 py-2 rounded-lg text-sm">{toast}</div>
      )}

      <div className="flex gap-2 mb-6">
        {(["routes", "rates", "vehicles"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          {tab === "routes" && (
            <div className="card overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Routes</h2>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() =>
                    setRouteForm({ name: "", start_city: "", end_city: "", distance_km: null })
                  }
                >
                  + Add Route
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">From</th>
                    <th className="pb-2 pr-4">To</th>
                    <th className="pb-2 pr-4">Km</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4">{r.start_city}</td>
                      <td className="py-2 pr-4">{r.end_city}</td>
                      <td className="py-2 pr-4">{r.distance_km ?? "—"}</td>
                      <td className="py-2 space-x-2">
                        <button
                          type="button"
                          className="text-primary-600 text-sm"
                          onClick={() => setRouteForm(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 text-sm"
                          onClick={() => deleteRoute(r.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "rates" && (
            <div className="card overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Route rates</h2>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() =>
                    setRateForm({
                      route_id: routes[0]?.id || "",
                      vehicle_type: vehicles[0]?.vehicle_type || "",
                      price_sar: 0,
                      is_sharing: false,
                    })
                  }
                >
                  + Add Rate
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Route</th>
                    <th className="pb-2 pr-4">Vehicle</th>
                    <th className="pb-2 pr-4">Price SAR</th>
                    <th className="pb-2 pr-4">Sharing</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-4">{r.route_name}</td>
                      <td className="py-2 pr-4">{r.vehicle_type}</td>
                      <td className="py-2 pr-4">{r.price_sar}</td>
                      <td className="py-2 pr-4">{r.is_sharing ? "Yes" : "No"}</td>
                      <td className="py-2 space-x-2">
                        <button
                          type="button"
                          className="text-primary-600 text-sm"
                          onClick={() =>
                            setRateForm({
                              id: r.id,
                              route_id: r.route_id,
                              vehicle_type: r.vehicle_type,
                              price_sar: r.price_sar,
                              is_sharing: r.is_sharing,
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 text-sm"
                          onClick={() => deleteRate(r.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "vehicles" && (
            <div className="card overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Vehicle types</h2>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => setVehicleForm({ vehicle_type: "", capacity_pax: 4 })}
                >
                  + Add Vehicle
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 pr-4">{v.vehicle_type}</td>
                      <td className="py-2 pr-4">{v.capacity_pax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {routeForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md space-y-3">
            <h3 className="font-semibold">{routeForm.id ? "Edit route" : "Add route"}</h3>
            <input
              className="input"
              placeholder="Route name"
              value={routeForm.name || ""}
              onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Start city"
              value={routeForm.start_city || ""}
              onChange={(e) => setRouteForm({ ...routeForm, start_city: e.target.value })}
            />
            <input
              className="input"
              placeholder="End city"
              value={routeForm.end_city || ""}
              onChange={(e) => setRouteForm({ ...routeForm, end_city: e.target.value })}
            />
            <input
              className="input"
              type="number"
              placeholder="Distance km"
              value={routeForm.distance_km ?? ""}
              onChange={(e) =>
                setRouteForm({ ...routeForm, distance_km: Number(e.target.value) || null })
              }
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setRouteForm(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveRoute}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {rateForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md space-y-3">
            <h3 className="font-semibold">{rateForm.id ? "Edit rate" : "Add rate"}</h3>
            <select
              className="input"
              value={rateForm.route_id}
              onChange={(e) => setRateForm({ ...rateForm, route_id: e.target.value })}
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={rateForm.vehicle_type}
              onChange={(e) => setRateForm({ ...rateForm, vehicle_type: e.target.value })}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicle_type}>
                  {v.vehicle_type}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              placeholder="Price SAR"
              value={rateForm.price_sar}
              onChange={(e) =>
                setRateForm({ ...rateForm, price_sar: Number(e.target.value) })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rateForm.is_sharing}
                onChange={(e) => setRateForm({ ...rateForm, is_sharing: e.target.checked })}
              />
              Sharing (per seat)
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setRateForm(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveRate}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {vehicleForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md space-y-3">
            <h3 className="font-semibold">Add vehicle type</h3>
            <input
              className="input"
              placeholder="Vehicle type"
              value={vehicleForm.vehicle_type}
              onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
            />
            <input
              className="input"
              type="number"
              placeholder="Capacity"
              value={vehicleForm.capacity_pax}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, capacity_pax: Number(e.target.value) })
              }
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setVehicleForm(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveVehicle}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
