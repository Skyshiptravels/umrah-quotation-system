"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface FinancialSummary {
  total_revenue: number;
  total_vendor_cost: number;
  total_gross_profit: number;
  total_commission: number;
  total_company_profit: number;
  quotations_count: number;
  quotations_approved: number;
  avg_profit_margin: number;
  cash_collected: number;
  revenue_received_count: number;
  daily_breakdown: Array<{
    date: string;
    revenue: number;
    cost: number;
    gross_profit: number;
    commission: number;
    company_profit: number;
    quote_count: number;
  }>;
}

export default function FinancialPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/api/financial/summary?days=${dateRange}`);
    const data = await res.json();
    if (res.ok) setSummary(data);
    setLoading(false);
  }, [apiFetch, dateRange]);

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
          <h1 className="text-2xl font-bold">Financial Overview</h1>
        </div>
        <div className="flex gap-2">
          <select
            className="input w-auto text-sm"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <Link href="/admin/invoices" className="btn-secondary text-sm">
            Invoices
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading financial data...</p>
      ) : !summary ? (
        <p className="text-gray-500">No financial data available</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card bg-green-50 border-green-100">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-700">
                {summary.total_revenue.toLocaleString()} SAR
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.quotations_approved} approved
              </p>
            </div>
            <div className="card bg-red-50 border-red-100">
              <p className="text-sm text-gray-600">Vendor Costs</p>
              <p className="text-2xl font-bold text-red-600">
                {summary.total_vendor_cost.toLocaleString()} SAR
              </p>
            </div>
            <div className="card bg-blue-50 border-blue-100">
              <p className="text-sm text-gray-600">Gross Profit</p>
              <p className="text-2xl font-bold text-blue-700">
                {summary.total_gross_profit.toLocaleString()} SAR
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.avg_profit_margin.toFixed(1)}% margin
              </p>
            </div>
            <div className="card bg-purple-50 border-purple-100">
              <p className="text-sm text-gray-600">Company Profit</p>
              <p className="text-2xl font-bold text-purple-700">
                {summary.total_company_profit.toLocaleString()} SAR
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cash collected: {summary.cash_collected.toLocaleString()} SAR
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <h2 className="font-semibold mb-4">Profit Breakdown</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Revenue</dt>
                  <dd className="font-medium text-green-700">
                    {summary.total_revenue.toLocaleString()} SAR
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt>Vendor Costs</dt>
                  <dd className="font-medium text-red-600">
                    -{summary.total_vendor_cost.toLocaleString()} SAR
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Gross Profit</dt>
                  <dd className="font-medium text-blue-700">
                    {summary.total_gross_profit.toLocaleString()} SAR
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt>Staff Commission</dt>
                  <dd className="font-medium text-orange-600">
                    -{summary.total_commission.toLocaleString()} SAR
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <dt>Company Profit</dt>
                  <dd className="text-purple-700">
                    {summary.total_company_profit.toLocaleString()} SAR
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">Performance</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Quotations Created</dt>
                  <dd className="font-medium">{summary.quotations_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Quotations Approved</dt>
                  <dd className="font-medium">{summary.quotations_approved}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Conversion Rate</dt>
                  <dd className="font-medium text-green-700">
                    {summary.quotations_count > 0
                      ? ((summary.quotations_approved / summary.quotations_count) * 100).toFixed(1)
                      : 0}
                    %
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Payments Received</dt>
                  <dd className="font-medium">{summary.revenue_received_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Avg Margin</dt>
                  <dd className="font-medium">{summary.avg_profit_margin.toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="card overflow-x-auto p-0">
            <h2 className="font-semibold px-4 pt-4 pb-2">Daily Summary</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Costs</th>
                  <th className="px-4 py-3 text-right">Gross Profit</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Company Profit</th>
                  <th className="px-4 py-3 text-center">Quotes</th>
                </tr>
              </thead>
              <tbody>
                {(summary.daily_breakdown ?? []).map((day) => (
                  <tr key={String(day.date)} className="border-b">
                    <td className="px-4 py-3">
                      {new Date(String(day.date)).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">{day.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{day.cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      {day.gross_profit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">{day.commission.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {day.company_profit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">{day.quote_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(summary.daily_breakdown ?? []).length === 0 && (
              <p className="p-8 text-center text-gray-500">
                Approve quotations to generate financial records
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
