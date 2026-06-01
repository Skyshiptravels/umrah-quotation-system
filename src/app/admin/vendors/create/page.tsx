"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function CreateVendorPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "HOTEL",
    contact_email: "",
    contact_phone: "",
    payment_terms: "NET_30",
    commission_rate: "0",
    notes: "",
    rate_type: "PER_BED",
    rate_amount: "",
    valid_from: "",
    valid_to: "",
  });

  if (!user || !["SUPER_ADMIN", "MANAGER"].includes(user.role)) {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/vendors", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          payment_terms: form.payment_terms,
          commission_rate: parseFloat(form.commission_rate) || 0,
          notes: form.notes,
          rate_type: form.rate_type,
          rate_amount: form.rate_amount ? parseFloat(form.rate_amount) : undefined,
          valid_from: form.valid_from || undefined,
          valid_to: form.valid_to || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vendor");
      router.push(`/admin/vendors/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/vendors" className="text-primary-600 text-sm hover:underline">
          ← Vendors
        </Link>
        <h1 className="text-2xl font-bold">Create New Vendor</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

        <div className="card space-y-4">
          <h2 className="font-semibold">Vendor Information</h2>
          <div>
            <label className="label">Vendor Name *</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Hotel ABC"
            />
          </div>
          <div>
            <label className="label">Type *</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="HOTEL">Hotel</option>
              <option value="TRANSPORT">Transport</option>
              <option value="VISA">Visa</option>
              <option value="AIRLINE">Airline</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Contact Details</h2>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="+966..."
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Payment Terms</h2>
          <div>
            <label className="label">Payment Terms</label>
            <select
              className="input"
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
            >
              <option value="NET_30">Net 30</option>
              <option value="NET_60">Net 60</option>
              <option value="UPFRONT">Upfront</option>
            </select>
          </div>
          <div>
            <label className="label">Commission Rate (%)</label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              className="input"
              value={form.commission_rate}
              onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Initial Rate (optional)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rate Type</label>
              <select
                className="input"
                value={form.rate_type}
                onChange={(e) => setForm({ ...form, rate_type: e.target.value })}
              >
                <option value="PER_BED">Per Bed</option>
                <option value="PER_ROOM">Per Room</option>
                <option value="PER_PAX">Per Pax</option>
                <option value="FLAT">Flat Rate</option>
              </select>
            </div>
            <div>
              <label className="label">Amount (SAR)</label>
              <input
                type="number"
                step={0.01}
                className="input"
                value={form.rate_amount}
                onChange={(e) => setForm({ ...form, rate_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Valid From</label>
              <input
                type="date"
                className="input"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Valid To</label>
              <input
                type="date"
                className="input"
                value={form.valid_to}
                onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating..." : "Create Vendor"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
