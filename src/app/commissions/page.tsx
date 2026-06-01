"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface CommissionRow {
  id: string;
  quotation_id: string;
  commission_amount_sar: string;
  status: string;
  created_at: string;
  customer_name?: string;
  total_cost_sar?: string;
}

export default function CommissionsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [stats, setStats] = useState({
    monthlyEarnings: 0,
    yearToDateEarnings: 0,
    totalQuotations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    apiFetch("/api/commissions")
      .then((r) => r.json())
      .then((d) => {
        setCommissions(d.commissions || []);
        setStats(
          d.stats || {
            monthlyEarnings: 0,
            yearToDateEarnings: 0,
            totalQuotations: 0,
          }
        );
      })
      .finally(() => setLoading(false));
  }, [user, apiFetch, router]);

  if (!user) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Commissions</h1>
        {["MANAGER", "SUPER_ADMIN", "ACCOUNTS_MANAGER"].includes(user.role) && (
          <Link href="/admin/commissions" className="btn-secondary text-sm">
            All Staff Commissions
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-gray-500 text-sm">This Month (SAR)</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.monthlyEarnings.toLocaleString()} SAR
          </p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">Year to Date (SAR)</p>
          <p className="text-2xl font-bold text-primary-600">
            {stats.yearToDateEarnings.toLocaleString()} SAR
          </p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">Quotations with Commission</p>
          <p className="text-2xl font-bold">{stats.totalQuotations}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : commissions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No commissions yet. Create and calculate quotations to earn commission.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Quotation</th>
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4 text-right">Quote Total</th>
                <th className="pb-2 text-right">Commission</th>
                <th className="pb-2 pl-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/quotations/${c.quotation_id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {c.quotation_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{c.customer_name}</td>
                  <td className="py-3 pr-4">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {parseFloat(c.total_cost_sar || "0").toLocaleString()} SAR
                  </td>
                  <td className="py-3 text-right font-semibold text-green-700">
                    {parseFloat(c.commission_amount_sar).toLocaleString()} SAR
                  </td>
                  <td className="py-3 pl-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === "PAID"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
