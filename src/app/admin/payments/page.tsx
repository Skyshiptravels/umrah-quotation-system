"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PaymentsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [sRes, pRes] = await Promise.all([
      apiFetch("/api/payments?view=summary"),
      apiFetch("/api/payments"),
    ]);
    const s = await sRes.json();
    const p = await pRes.json();
    setSummary(s);
    setPayments(p.data || []);
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function markPaid(id: string) {
    await apiFetch("/api/payments", {
      method: "PATCH",
      body: JSON.stringify({ payment_id: id }),
    });
    void load();
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-primary-600 text-sm hover:underline">← Admin</Link>
        <h1 className="text-2xl font-bold">Payment Tracking</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold">{summary.pending_count ?? 0}</p></div>
        <div className="card text-center"><p className="text-sm text-gray-500">Pending SAR</p><p className="text-2xl font-bold">{(summary.pending_amount ?? 0).toLocaleString()}</p></div>
        <div className="card text-center"><p className="text-sm text-red-600">Overdue</p><p className="text-2xl font-bold text-red-600">{summary.overdue_count ?? 0}</p></div>
        <div className="card text-center"><p className="text-sm text-green-600">Paid This Month</p><p className="text-2xl font-bold text-green-600">{(summary.paid_amount_month ?? 0).toLocaleString()}</p></div>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={String(p.id)} className="border-b">
                  <td className="px-4 py-3">{String(p.client_name)}</td>
                  <td className="px-4 py-3">{Number(p.amount_due).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(p.amount_paid).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(p.balance).toLocaleString()}</td>
                  <td className="px-4 py-3">{String(p.status)}</td>
                  <td className="px-4 py-3">
                    {p.status !== "PAID" && (
                      <button type="button" className="text-primary-600 text-xs hover:underline" onClick={() => markPaid(String(p.id))}>Mark Paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
