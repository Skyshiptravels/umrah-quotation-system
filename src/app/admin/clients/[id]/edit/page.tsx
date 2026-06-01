"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface StaffOption {
  id: string;
  full_name: string;
}

export default function EditClientPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    whatsapp_number: "",
    preferred_contact: "EMAIL",
    budget_range: "",
    preferred_dates: "",
    travel_group_size: "",
    special_requirements: "",
    assigned_staff_id: "",
    status: "ACTIVE",
  });

  const load = useCallback(async () => {
    const [clientRes, staffRes] = await Promise.all([
      apiFetch(`/api/clients/${clientId}`),
      apiFetch("/api/hr"),
    ]);
    const client = await clientRes.json();
    const staffData = await staffRes.json();
    setStaff(staffData.staff || []);
    if (client.client) {
      const c = client.client;
      setForm({
        full_name: String(c.full_name || ""),
        phone: String(c.phone || ""),
        whatsapp_number: String(c.whatsapp_number || ""),
        preferred_contact: String(c.preferred_contact || "EMAIL"),
        budget_range: String(c.budget_range || ""),
        preferred_dates: String(c.preferred_dates || ""),
        travel_group_size: c.travel_group_size != null ? String(c.travel_group_size) : "",
        special_requirements: String(c.special_requirements || ""),
        assigned_staff_id: String(c.assigned_staff_id || ""),
        status: String(c.status || "ACTIVE"),
      });
    }
    setLoading(false);
  }, [apiFetch, clientId]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`/api/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone,
          whatsapp_number: form.whatsapp_number || null,
          preferred_contact: form.preferred_contact,
          budget_range: form.budget_range || null,
          preferred_dates: form.preferred_dates || null,
          travel_group_size: form.travel_group_size
            ? parseInt(form.travel_group_size, 10)
            : null,
          special_requirements: form.special_requirements || null,
          assigned_staff_id: form.assigned_staff_id || null,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      router.push(`/admin/clients/${clientId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) return <p className="text-gray-500 p-6">Loading...</p>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/clients/${clientId}`} className="text-primary-600 text-sm hover:underline">
          ← Client
        </Link>
        <h1 className="text-2xl font-bold">Edit Client</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

        <div className="card space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input
              className="input"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input
              className="input"
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
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">Budget Range</label>
            <select
              className="input"
              value={form.budget_range}
              onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
            >
              <option value="">—</option>
              <option value="budget">Budget</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="label">Preferred Months</label>
            <input
              className="input"
              value={form.preferred_dates}
              onChange={(e) => setForm({ ...form, preferred_dates: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Group Size</label>
            <input
              className="input"
              type="number"
              value={form.travel_group_size}
              onChange={(e) => setForm({ ...form, travel_group_size: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Special Requirements</label>
            <textarea
              className="input min-h-[80px]"
              value={form.special_requirements}
              onChange={(e) => setForm({ ...form, special_requirements: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Assigned Staff</label>
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
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
