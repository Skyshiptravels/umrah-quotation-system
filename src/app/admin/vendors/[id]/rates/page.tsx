"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface RateRow {
  id: string;
  rate_type: string;
  amount: number;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  version_number: number;
  is_current: boolean;
  created_at: string;
}

export default function VendorRatesPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const vendorId = params.id as string;
  const [rates, setRates] = useState<RateRow[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [form, setForm] = useState({
    rate_type: "PER_BED",
    amount: "",
    valid_from: "",
    valid_to: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [vRes, rRes] = await Promise.all([
      apiFetch(`/api/vendors/${vendorId}`),
      apiFetch(`/api/vendors/${vendorId}/rates`),
    ]);
    const v = await vRes.json();
    const r = await rRes.json();
    if (v.vendor) setVendorName(v.vendor.name);
    setRates(r.data || []);
  }, [apiFetch, vendorId]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function addRate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch(`/api/vendors/${vendorId}/rates`, {
      method: "POST",
      body: JSON.stringify({
        rate_type: form.rate_type,
        amount: parseFloat(form.amount),
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
      }),
    });
    setForm({ rate_type: "PER_BED", amount: "", valid_from: "", valid_to: "" });
    await load();
    setSaving(false);
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/vendors/${vendorId}`} className="text-primary-600 text-sm hover:underline">
          ← {vendorName || "Vendor"}
        </Link>
        <h1 className="text-2xl font-bold">Rate Management</h1>
      </div>

      {["SUPER_ADMIN", "MANAGER"].includes(user.role) && (
        <form onSubmit={addRate} className="card mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
              <option value="PER_BED">Per Bed</option>
              <option value="PER_ROOM">Per Room</option>
              <option value="PER_PAX">Per Pax</option>
              <option value="FLAT">Flat</option>
            </select>
          </div>
          <div>
            <label className="label">Amount SAR</label>
            <input type="number" required step={0.01} className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Valid From</label>
            <input type="date" className="input" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
          </div>
          <div>
            <label className="label">Valid To</label>
            <input type="date" className="input" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Adding..." : "Add Rate"}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Valid From</th>
              <th className="px-4 py-3">Valid To</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className={`border-b ${r.is_current ? "bg-primary-50" : ""}`}>
                <td className="px-4 py-3 font-mono">v{r.version_number}</td>
                <td className="px-4 py-3">{r.rate_type}</td>
                <td className="px-4 py-3 font-medium">{r.amount} {r.currency}</td>
                <td className="px-4 py-3">{r.valid_from || "—"}</td>
                <td className="px-4 py-3">{r.valid_to || "—"}</td>
                <td className="px-4 py-3">{r.is_current ? "Current" : "Archived"}</td>
                <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rates.length === 0 && <p className="p-8 text-center text-gray-500">No rates yet</p>}
      </div>
    </div>
  );
}
