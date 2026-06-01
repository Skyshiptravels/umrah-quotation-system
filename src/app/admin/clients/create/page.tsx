"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface StaffOption {
  id: string;
  full_name: string;
}

export default function CreateClientPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    preferred_contact: "EMAIL",
    budget_range: "",
    preferred_dates: "",
    travel_group_size: "",
    special_requirements: "",
    assigned_staff_id: "",
  });

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/hr")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff || []))
      .catch(() => setStaff([]));
  }, [user, apiFetch]);

  if (!user || !["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT"].includes(user.role)) {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          whatsapp_number: form.whatsapp_number || undefined,
          preferred_contact: form.preferred_contact,
          budget_range: form.budget_range || undefined,
          preferred_dates: form.preferred_dates || undefined,
          travel_group_size: form.travel_group_size
            ? parseInt(form.travel_group_size, 10)
            : undefined,
          special_requirements: form.special_requirements || undefined,
          assigned_staff_id: form.assigned_staff_id || undefined,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create client");
      router.push(`/admin/clients/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/clients" className="text-primary-600 text-sm hover:underline">
          ← Clients
        </Link>
        <h1 className="text-2xl font-bold">Create New Client</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

        <div className="card space-y-4">
          <h2 className="font-semibold">Contact Information</h2>
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ahmed Khan"
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input
              className="input"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input
              className="input"
              type="tel"
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Preferred Contact</label>
            <select
              className="input"
              value={form.preferred_contact}
              onChange={(e) => setForm({ ...form, preferred_contact: e.target.value })}
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Preferences</h2>
          <div>
            <label className="label">Budget Range</label>
            <select
              className="input"
              value={form.budget_range}
              onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
            >
              <option value="">— Select —</option>
              <option value="budget">Budget</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="label">Preferred Travel Months</label>
            <input
              className="input"
              value={form.preferred_dates}
              onChange={(e) => setForm({ ...form, preferred_dates: e.target.value })}
              placeholder="June, July, August"
            />
          </div>
          <div>
            <label className="label">Travel Group Size</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.travel_group_size}
              onChange={(e) => setForm({ ...form, travel_group_size: e.target.value })}
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Special Requirements</h2>
          <textarea
            className="input min-h-[100px]"
            rows={4}
            value={form.special_requirements}
            onChange={(e) => setForm({ ...form, special_requirements: e.target.value })}
          />
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Assign to Staff</h2>
          <select
            className="input"
            value={form.assigned_staff_id}
            onChange={(e) => setForm({ ...form, assigned_staff_id: e.target.value })}
          >
            <option value="">— Unassigned —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating..." : "Create Client"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
