"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface UserForm {
  id: string;
  email: string;
  full_name: string;
  role: string;
  commission_rate: number;
  is_active: boolean;
}

const ROLES = [
  { value: "STAFF", label: "Staff — create quotations" },
  { value: "AGENT", label: "Agent — travel agent" },
  { value: "MANAGER", label: "Manager — team lead" },
  { value: "ACCOUNTS_MANAGER", label: "Accounts Manager — finance" },
  { value: "SUPER_ADMIN", label: "Super Admin — full access" },
  { value: "VIEWER", label: "Viewer — read only" },
];

export default function EditUserPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [formData, setFormData] = useState<UserForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }

    apiFetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setFormData(d.user);
        else setError(d.error || "User not found");
      })
      .catch(() => setError("Failed to load user"))
      .finally(() => setLoading(false));
  }, [user, router, apiFetch, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    setError("");

    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: formData.full_name,
          role: formData.role,
          commission_rate: formData.commission_rate,
          is_active: formData.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      router.push("/admin/users");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user || user.role !== "SUPER_ADMIN") return null;
  if (loading) return <p className="text-gray-500">Loading user...</p>;
  if (!formData) return <p className="text-red-600">{error || "User not found"}</p>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users" className="text-primary-600 text-sm hover:underline">
          ← Users
        </Link>
        <h1 className="text-2xl font-bold">Edit User</h1>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}

        <div>
          <label className="label">Email (read-only)</label>
          <input type="email" value={formData.email} disabled className="input bg-gray-50" />
        </div>

        <div>
          <label className="label">Full Name</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="label">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="input"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Commission Rate (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={formData.commission_rate}
            onChange={(e) =>
              setFormData({
                ...formData,
                commission_rate: parseFloat(e.target.value) || 0,
              })
            }
            className="input"
          />
          <p className="text-xs text-gray-500 mt-1">
            Changes apply to future quotations only
          </p>
        </div>

        <div>
          <label className="label">Status</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={formData.is_active}
                onChange={() => setFormData({ ...formData, is_active: true })}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!formData.is_active}
                onChange={() => setFormData({ ...formData, is_active: false })}
              />
              Inactive
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
