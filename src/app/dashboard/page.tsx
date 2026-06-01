"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface DashboardData {
  metrics?: {
    quotations_today?: number;
    revenue_today?: number;
    pending_approval?: number;
    overdue_payments?: number;
    overdue_amount?: number;
    vendor_outstanding?: number;
    gross_profit_30d?: number;
    company_profit_30d?: number;
    cash_collected_30d?: number;
    approved_30d?: number;
  };
  pipeline?: Record<string, number>;
  payments?: Record<string, number>;
  staff_performance?: Array<{ name: string; quote_count: number; revenue: number }>;
  alerts?: { at_risk_clients?: number; overdue_invoices?: number };
  financial?: {
    total_revenue?: number;
    total_gross_profit?: number;
    total_company_profit?: number;
    avg_margin?: number;
    cash_collected?: number;
    period_totals?: { revenue?: number; quotations?: number };
  };
}

export default function DashboardPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    apiFetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [user, apiFetch, router]);

  if (!user) return null;

  const m = data?.metrics || {};
  const isAdmin = ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back, {user.email}</p>

      {loading ? (
        <p className="text-gray-500">Loading metrics...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: "Quotes Today", value: m.quotations_today ?? 0 },
              { label: "Revenue Today", value: `${(m.revenue_today ?? 0).toLocaleString()} SAR` },
              ...(isAdmin
                ? [
                    { label: "Pending Approval", value: m.pending_approval ?? 0 },
                    { label: "Overdue Invoices", value: m.overdue_payments ?? 0, alert: true },
                    { label: "Overdue SAR", value: (m.overdue_amount ?? 0).toLocaleString(), alert: true },
                    { label: "Vendor Due", value: (m.vendor_outstanding ?? 0).toLocaleString() },
                  ]
                : []),
            ].map((s) => (
              <div key={s.label} className="card">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${"alert" in s && s.alert ? "text-red-600" : "text-primary-600"}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {isAdmin && data?.financial && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card bg-green-50 border-green-100">
                <p className="text-xs text-gray-500">30-Day Revenue</p>
                <p className="text-xl font-bold text-green-700">
                  {(data.financial.total_revenue ?? 0).toLocaleString()} SAR
                </p>
              </div>
              <div className="card bg-blue-50 border-blue-100">
                <p className="text-xs text-gray-500">Gross Profit (30d)</p>
                <p className="text-xl font-bold text-blue-700">
                  {(data.financial.total_gross_profit ?? m.gross_profit_30d ?? 0).toLocaleString()} SAR
                </p>
              </div>
              <div className="card bg-purple-50 border-purple-100">
                <p className="text-xs text-gray-500">Company Profit (30d)</p>
                <p className="text-xl font-bold text-purple-700">
                  {(data.financial.total_company_profit ?? m.company_profit_30d ?? 0).toLocaleString()} SAR
                </p>
              </div>
              <div className="card bg-orange-50 border-orange-100">
                <p className="text-xs text-gray-500">Cash Collected</p>
                <p className="text-xl font-bold">
                  {(data.financial.cash_collected ?? m.cash_collected_30d ?? 0).toLocaleString()} SAR
                </p>
              </div>
            </div>
          )}

          {isAdmin && data?.pipeline && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card">
                <h2 className="font-semibold mb-4">Quotation Pipeline</h2>
                <div className="space-y-2 text-sm">
                  {Object.entries(data.pipeline).map(([status, count]) => (
                    <div key={status} className="flex justify-between border-b pb-2">
                      <span>{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold mb-4">Alerts</h2>
                <ul className="text-sm space-y-2">
                  <li className="flex justify-between"><span>At-risk clients (6+ months)</span><span>{data.alerts?.at_risk_clients ?? 0}</span></li>
                  <li className="flex justify-between"><span>Overdue invoices</span><span className="text-red-600">{data.alerts?.overdue_invoices ?? 0}</span></li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/admin/payments" className="btn-secondary text-xs">Payments</Link>
                  <Link href="/admin/financial" className="btn-secondary text-xs">Financial</Link>
                  <Link href="/admin/clients" className="btn-secondary text-xs">Clients</Link>
                </div>
              </div>
            </div>
          )}

          {isAdmin && data?.staff_performance && data.staff_performance.length > 0 && (
            <div className="card mb-8">
              <h2 className="font-semibold mb-4">Top Staff Performance</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Staff</th><th className="pb-2">Quotations</th><th className="pb-2">Revenue SAR</th></tr></thead>
                <tbody>
                  {data.staff_performance.slice(0, 5).map((s) => (
                    <tr key={s.name} className="border-b">
                      <td className="py-2">{s.name}</td>
                      <td className="py-2">{s.quote_count}</td>
                      <td className="py-2">{s.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {["STAFF", "AGENT", "SUPER_ADMIN"].includes(user.role) && (
            <Link href="/quotations/new" className="btn-primary text-sm">New Quotation</Link>
          )}
          <Link href="/quotations" className="btn-secondary text-sm">View Quotations</Link>
          {isAdmin && <Link href="/admin" className="btn-secondary text-sm">Admin Panel</Link>}
        </div>
      </div>
    </div>
  );
}
