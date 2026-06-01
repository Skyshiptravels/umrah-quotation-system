"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ClientDetail {
  client: Record<string, unknown>;
  quotations: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  balance_due: number;
  metrics: {
    outstanding_balance: number;
    average_spend: number;
    is_repeat: boolean;
  };
}

export default function ClientDetailPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/clients/${clientId}`);
    const d = await res.json();
    if (res.ok) setData(d);
    setLoading(false);
  }, [apiFetch, clientId]);

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

  async function deactivate() {
    if (!confirm("Deactivate this client?")) return;
    await apiFetch(`/api/clients/${clientId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "INACTIVE" }),
    });
    void load();
  }

  if (!user || loading) return <p className="text-gray-500 p-6">Loading...</p>;
  if (!data?.client) return <p className="text-red-600 p-6">Client not found</p>;

  const client = data.client;
  const quotations = data.quotations || [];
  const totalBookings = Number(client.total_bookings) || 0;
  const totalSpent = Number(client.total_spent) || 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/admin/clients" className="text-primary-600 text-sm hover:underline">
            ← Clients
          </Link>
          <h1 className="text-2xl font-bold mt-1">{String(client.full_name)}</h1>
          {(client.repeat_customer || data.metrics.is_repeat) && (
            <p className="text-amber-600 text-sm">⭐ Repeat Customer</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/clients/${clientId}/history`} className="btn-secondary text-sm">
            Full History
          </Link>
          <Link href={`/admin/clients/${clientId}/payments`} className="btn-secondary text-sm">
            Payments
          </Link>
          {["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT"].includes(user.role) && (
            <Link href={`/admin/clients/${clientId}/edit`} className="btn-primary text-sm">
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold">{totalBookings}</p>
        </div>
        <div className="card bg-green-50 border-green-100">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-2xl font-bold">{totalSpent.toLocaleString()} SAR</p>
        </div>
        <div className="card bg-purple-50 border-purple-100">
          <p className="text-sm text-gray-600">Average Spend</p>
          <p className="text-2xl font-bold">{data.metrics.average_spend.toLocaleString()} SAR</p>
        </div>
        <div className="card bg-orange-50 border-orange-100">
          <p className="text-sm text-gray-600">Outstanding Balance</p>
          <p className="text-2xl font-bold text-red-600">
            {data.balance_due.toLocaleString()} SAR
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold mb-2">Contact Information</h2>
          <p><span className="text-gray-500">Email:</span> {String(client.email)}</p>
          <p><span className="text-gray-500">Phone:</span> {String(client.phone)}</p>
          {Boolean(client.whatsapp_number) && (
            <p><span className="text-gray-500">WhatsApp:</span> {String(client.whatsapp_number)}</p>
          )}
          <p><span className="text-gray-500">Preferred Contact:</span> {String(client.preferred_contact)}</p>
          {Boolean(client.assigned_staff_name) && (
            <p><span className="text-gray-500">Assigned Staff:</span> {String(client.assigned_staff_name)}</p>
          )}
        </div>

        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold mb-2">Preferences</h2>
          {Boolean(client.budget_range) && (
            <p><span className="text-gray-500">Budget:</span> {String(client.budget_range)}</p>
          )}
          {Boolean(client.preferred_dates) && (
            <p><span className="text-gray-500">Preferred Months:</span> {String(client.preferred_dates)}</p>
          )}
          {client.travel_group_size != null && (
            <p><span className="text-gray-500">Group Size:</span> {String(client.travel_group_size)}</p>
          )}
          <p>
            <span className="text-gray-500">Status:</span>{" "}
            <span className={client.status === "ACTIVE" ? "text-green-700" : "text-red-600"}>
              {String(client.status)}
            </span>
          </p>
        </div>
      </div>

      {Boolean(client.special_requirements) && (
        <div className="card mb-6 text-sm">
          <h2 className="font-semibold mb-2">Special Requirements</h2>
          <p className="text-gray-600">{String(client.special_requirements)}</p>
        </div>
      )}

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Recent Quotations</h2>
        {quotations.length === 0 ? (
          <p className="text-sm text-gray-500">No quotations linked yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.slice(0, 5).map((q) => (
                  <tr key={String(q.id)} className="border-b">
                    <td className="py-2 pr-4">
                      <Link href={`/quotations/${q.id}`} className="text-primary-600 hover:underline">
                        {String(q.customer_name || q.id).slice(0, 24)}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      {new Date(String(q.created_at)).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4">
                      {Number(q.total_cost_sar).toLocaleString()} SAR
                    </td>
                    <td className="py-2">{String(q.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {["SUPER_ADMIN", "MANAGER"].includes(user.role) && client.status === "ACTIVE" && (
        <button
          type="button"
          className="btn-secondary text-red-600 border-red-200"
          onClick={deactivate}
        >
          Deactivate Client
        </button>
      )}
    </div>
  );
}
