"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const ROLES = [
  { value: "STAFF", label: "Staff — create quotations" },
  { value: "AGENT", label: "Agent — travel agent" },
  { value: "MANAGER", label: "Manager — team lead" },
  { value: "ACCOUNTS_MANAGER", label: "Accounts Manager — finance" },
  { value: "SUPER_ADMIN", label: "Super Admin — full access" },
  { value: "VIEWER", label: "Viewer — read only" },
];

export default function CreateUserPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "STAFF",
    commission_rate: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  if (!user || user.role !== "SUPER_ADMIN") {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  function generatePassword() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          password: generatedPassword || "TempPass@123",
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      const pwd = data.temporary_password || generatedPassword || "TempPass@123";
      alert(
        `User created successfully.\nPassword: ${pwd}\nUser should change password on first login.`
      );
      router.push("/admin/users");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users" className="text-primary-600 text-sm hover:underline">
          ← Users
        </Link>
        <h1 className="text-2xl font-bold">Create New User</h1>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}

        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input"
            placeholder="user@umrah.com"
          />
        </div>

        <div>
          <label className="label">Full Name *</label>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="input"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="label">Role *</label>
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
          <label className="label">Commission Rate (%) *</label>
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
            Percentage of quotation total (SAR) earned as commission
          </p>
        </div>

        <div>
          <label className="label">Password</label>
          <button
            type="button"
            onClick={generatePassword}
            className="text-primary-600 text-sm hover:underline"
          >
            Generate random password
          </button>
          {generatedPassword && (
            <div className="mt-2 p-3 bg-primary-50 border border-primary-100 rounded text-sm">
              <strong>Generated:</strong>{" "}
              <code className="bg-white px-2 py-0.5 rounded">{generatedPassword}</code>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Creating..." : "Create User"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
