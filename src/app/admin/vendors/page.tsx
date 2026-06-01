"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface Vendor {
  id: string;
  name: string;
  type: string;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms: string;
  commission_rate: number;
  is_active: boolean;
}

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "HOTEL", label: "Hotel" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "VISA", label: "Visa" },
  { value: "AIRLINE", label: "Airline" },
  { value: "OTHER", label: "Other" },
];

export default function VendorsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    const res = await apiFetch(`/api/vendors?${params}`);
    const d = await res.json();
    setVendors(d.data || []);
    setLoading(false);
  }, [apiFetch, search, typeFilter]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-primary-600 text-sm hover:underline">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">Vendors</h1>
        </div>
        {["SUPER_ADMIN", "MANAGER"].includes(user.role) && (
          <Link href="/admin/vendors/create" className="btn-primary text-sm">
            + Add Vendor
          </Link>
        )}
      </div>

      <div className="card mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="input md:col-span-2"
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading vendors...</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Terms</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3">{v.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{v.contact_email || "—"}</td>
                  <td className="px-4 py-3">{v.payment_terms.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{v.commission_rate}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        v.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {v.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/vendors/${v.id}`}
                      className="text-primary-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendors.length === 0 && (
            <p className="p-8 text-center text-gray-500">
              No vendors found.{" "}
              <Link href="/admin/vendors/create" className="text-primary-600 hover:underline">
                Create one
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
