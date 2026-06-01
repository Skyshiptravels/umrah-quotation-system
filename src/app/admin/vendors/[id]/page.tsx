"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface VendorDetail {
  vendor: Record<string, unknown>;
  rates: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  availability: Array<Record<string, unknown>>;
  performance: {
    total_rates: number;
    current_rate: number | null;
    total_payments: number;
    paid_on_time_percent: number;
    outstanding_balance: number;
    avg_payment_amount: number;
  };
  outstanding_balance: number;
}

export default function VendorDetailPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const vendorId = params.id as string;
  const [data, setData] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [availForm, setAvailForm] = useState({ available_from: "", available_to: "", capacity: "" });

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/vendors/${vendorId}`);
    const d = await res.json();
    if (res.ok) setData(d);
    setLoading(false);
  }, [apiFetch, vendorId]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function deactivate() {
    if (!confirm("Deactivate this vendor?")) return;
    await apiFetch(`/api/vendors/${vendorId}`, {
      method: "PUT",
      body: JSON.stringify({ is_active: false }),
    });
    void load();
  }

  async function addAvailability(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch(`/api/vendors/${vendorId}/availability`, {
      method: "POST",
      body: JSON.stringify({
        available_from: availForm.available_from,
        available_to: availForm.available_to,
        capacity: availForm.capacity ? parseInt(availForm.capacity, 10) : undefined,
      }),
    });
    setAvailForm({ available_from: "", available_to: "", capacity: "" });
    void load();
  }

  if (!user || loading) return <p className="text-gray-500 p-6">Loading...</p>;
  if (!data?.vendor) return <p className="text-red-600 p-6">Vendor not found</p>;

  const v = data.vendor;
  const perf = data.performance;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/vendors" className="text-primary-600 text-sm hover:underline">
            ← Vendors
          </Link>
          <h1 className="text-2xl font-bold">{String(v.name)}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/vendors/${vendorId}/rates`} className="btn-secondary text-sm">
            Manage Rates
          </Link>
          <Link href={`/admin/vendors/${vendorId}/payments`} className="btn-secondary text-sm">
            Payments
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold mb-2">Vendor Info</h2>
          <p><span className="text-gray-500">Type:</span> {String(v.type)}</p>
          <p><span className="text-gray-500">Email:</span> {String(v.contact_email || "—")}</p>
          <p><span className="text-gray-500">Phone:</span> {String(v.contact_phone || "—")}</p>
          <p><span className="text-gray-500">Terms:</span> {String(v.payment_terms)}</p>
          <p><span className="text-gray-500">Commission:</span> {Number(v.commission_rate)}%</p>
          <p>
            <span className="text-gray-500">Status:</span>{" "}
            {v.is_active ? (
              <span className="text-green-700">Active</span>
            ) : (
              <span className="text-red-600">Inactive</span>
            )}
          </p>
        </div>

        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold mb-2">Performance</h2>
          <p>Current rate: {perf.current_rate != null ? `${perf.current_rate} SAR` : "—"}</p>
          <p>Rate versions: {perf.total_rates}</p>
          <p>Payments recorded: {perf.total_payments}</p>
          <p>Paid on time: {perf.paid_on_time_percent}%</p>
          <p className="font-medium text-red-600">
            Outstanding: {perf.outstanding_balance.toLocaleString()} SAR
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-2">Notes</h2>
        <p className="text-sm text-gray-600">{String(v.notes || "No notes")}</p>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Availability Calendar</h2>
        {data.availability.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">No availability slots yet</p>
        ) : (
          <ul className="text-sm space-y-1 mb-4">
            {data.availability.map((a) => (
              <li key={String(a.id)}>
                {String(a.available_from)} → {String(a.available_to)}
                {a.capacity != null ? ` · capacity ${a.capacity}` : ""}
              </li>
            ))}
          </ul>
        )}
        {["SUPER_ADMIN", "MANAGER"].includes(user.role) && (
          <form onSubmit={addAvailability} className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="label text-xs">From</label>
              <input type="date" required className="input text-sm" value={availForm.available_from} onChange={(e) => setAvailForm({ ...availForm, available_from: e.target.value })} />
            </div>
            <div>
              <label className="label text-xs">To</label>
              <input type="date" required className="input text-sm" value={availForm.available_to} onChange={(e) => setAvailForm({ ...availForm, available_to: e.target.value })} />
            </div>
            <div>
              <label className="label text-xs">Capacity</label>
              <input type="number" className="input text-sm w-24" value={availForm.capacity} onChange={(e) => setAvailForm({ ...availForm, capacity: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary text-sm">Add Slot</button>
          </form>
        )}
      </div>

      {["SUPER_ADMIN", "MANAGER"].includes(user.role) && Boolean(v.is_active) && (
        <button type="button" className="btn-secondary text-red-600 border-red-200" onClick={deactivate}>
          Deactivate Vendor
        </button>
      )}
    </div>
  );
}
