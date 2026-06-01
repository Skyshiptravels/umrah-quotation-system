"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  total_bookings: number;
  total_spent: number;
  last_booking_date: string | null;
  repeat_customer: boolean;
}

export default function ClientsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await apiFetch(`/api/clients?${params}`);
    const d = await res.json();
    setClients(d.data || []);
    setLoading(false);
  }, [apiFetch, search, statusFilter]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  const summary = useMemo(
    () => ({
      total: clients.length,
      active: clients.filter((c) => c.status === "ACTIVE").length,
      repeat: clients.filter((c) => c.repeat_customer).length,
      spent: clients.reduce((s, c) => s + (c.total_spent || 0), 0),
    }),
    [clients]
  );

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-primary-600 text-sm hover:underline">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">Clients</h1>
        </div>
        {["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT"].includes(user.role) && (
          <Link href="/admin/clients/create" className="btn-primary text-sm">
            + Add Client
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-gray-600">Total Clients</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </div>
        <div className="card bg-green-50 border-green-100">
          <p className="text-sm text-gray-600">Active Clients</p>
          <p className="text-2xl font-bold">{summary.active}</p>
        </div>
        <div className="card bg-purple-50 border-purple-100">
          <p className="text-sm text-gray-600">Repeat Customers</p>
          <p className="text-2xl font-bold">{summary.repeat}</p>
        </div>
        <div className="card bg-orange-50 border-orange-100">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-2xl font-bold">{Math.round(summary.spent).toLocaleString()} SAR</p>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap gap-3">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="vip">VIP</option>
        </select>
        <button type="button" className="btn-secondary" onClick={() => load()}>
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading clients...</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Total Spent</th>
                <th className="px-4 py-3">Last Booking</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {c.repeat_customer && <span className="mr-1">⭐</span>}
                    {c.full_name}
                  </td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        c.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : c.status === "VIP"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{c.total_bookings}</td>
                  <td className="px-4 py-3">{c.total_spent.toLocaleString()} SAR</td>
                  <td className="px-4 py-3">
                    {c.last_booking_date
                      ? new Date(c.last_booking_date).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/clients/${c.id}`} className="btn-secondary text-xs">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && (
            <p className="p-8 text-center text-gray-500">
              No clients found.{" "}
              <Link href="/admin/clients/create" className="text-primary-600 hover:underline">
                Create one
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
