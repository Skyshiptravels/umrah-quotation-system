"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isConfigAdminRole } from "@/lib/admin-access";
import VisaFormModal, { VisaCategory, VisaFormData } from "@/components/admin/VisaFormModal";

export default function VisaAdminPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [visas, setVisas] = useState<VisaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<VisaCategory | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/visa/categories");
      const data = await res.json();
      setVisas(data.data || []);
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
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredVisas = useMemo(() => {
    let result = visas;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (v) => v.code.toLowerCase().includes(q) || v.name.toLowerCase().includes(q)
      );
    }
    if (statusFilter === "active") result = result.filter((v) => v.is_active);
    else if (statusFilter === "inactive") result = result.filter((v) => !v.is_active);
    return result;
  }, [visas, searchTerm, statusFilter]);

  const avgCommission =
    visas.length > 0
      ? visas.reduce((sum, v) => sum + v.commission_percent, 0) / visas.length
      : 0;

  async function saveVisa(data: VisaFormData) {
    const isEdit = Boolean(editing);
    const res = await apiFetch(
      isEdit ? `/api/admin/visa/categories/${editing!.id}` : "/api/admin/visa/categories",
      {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(data),
      }
    );
    const d = await res.json();
    if (!res.ok) {
      setToast(d.error || "Save failed");
      throw new Error(d.error);
    }
    setShowForm(false);
    setEditing(null);
    setToast("Visa category saved");
    void load();
  }

  async function deleteVisa(id: string) {
    if (!confirm("Delete this visa category?")) return;
    const res = await apiFetch(`/api/admin/visa/categories/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) {
      setToast(d.error || "Delete failed");
      return;
    }
    setToast("Visa category deleted");
    void load();
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-primary-600 text-sm hover:underline">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">Visa Rate Management</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/visa/import" className="btn-secondary text-sm">
            Import CSV
          </Link>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Add Category
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-4 bg-green-50 text-green-800 px-4 py-2 rounded-lg text-sm">{toast}</div>
      )}

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="input"
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading visa categories...</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Adult SAR</th>
                <th className="px-4 py-3 text-right">Infant SAR</th>
                <th className="px-4 py-3 text-center">Process</th>
                <th className="px-4 py-3 text-center">Valid</th>
                <th className="px-4 py-3 text-center">Commission</th>
                <th className="px-4 py-3 text-center">Season</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisas.map((visa) => (
                <tr key={visa.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{visa.code}</td>
                  <td className="px-4 py-3">{visa.name}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {visa.adult_child_rate_sar} SAR
                  </td>
                  <td className="px-4 py-3 text-right">{visa.infant_rate_sar} SAR</td>
                  <td className="px-4 py-3 text-center">{visa.processing_time_days}d</td>
                  <td className="px-4 py-3 text-center">{visa.validity_days}d</td>
                  <td className="px-4 py-3 text-center">{visa.commission_percent}%</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    S×{visa.summer_rate_multiplier} / W×{visa.winter_rate_multiplier}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        visa.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {visa.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                      <button
                        type="button"
                        className="text-primary-600 hover:underline"
                        onClick={() => {
                          setEditing(visa);
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </button>
                      <Link
                        href={`/admin/visa/${visa.id}/history`}
                        className="text-gray-600 hover:underline"
                      >
                        History
                      </Link>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => deleteVisa(visa.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVisas.length === 0 && (
            <p className="p-8 text-center text-gray-500">No visa categories found</p>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Total Categories</p>
          <p className="text-2xl font-bold">{visas.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {visas.filter((v) => v.is_active).length}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Inactive</p>
          <p className="text-2xl font-bold text-red-600">
            {visas.filter((v) => !v.is_active).length}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Avg Commission</p>
          <p className="text-2xl font-bold">{avgCommission.toFixed(1)}%</p>
        </div>
      </div>

      {showForm && (
        <VisaFormModal
          visa={editing}
          onSave={saveVisa}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
