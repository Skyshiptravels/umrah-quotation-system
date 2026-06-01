"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface StaffCommissionSummary {
  id: string;
  name: string;
  email: string;
  monthly_earnings: number;
  yearly_earnings: number;
  quotation_count: number;
  commissions: Array<{
    id: string;
    quotation_id: string;
    customer_name?: string;
    total_cost_sar?: string;
    commission_amount_sar: string;
    status: string;
  }>;
}

export default function AdminCommissionsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffCommissionSummary[]>([]);
  const [selected, setSelected] = useState<StaffCommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!["MANAGER", "SUPER_ADMIN", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/commissions");
      return;
    }
    apiFetch("/api/admin/commissions")
      .then((r) => r.json())
      .then((d) => {
        const list = d.data || [];
        setStaffList(list);
        if (list.length) setSelected(list[0]);
      })
      .finally(() => setLoading(false));
  }, [user, apiFetch, router]);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-primary-600 text-sm hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold">Staff Commissions</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="card lg:col-span-1 p-0 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm">
              Staff Members
            </div>
            <div className="divide-y max-h-[480px] overflow-y-auto">
              {staffList.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => setSelected(staff)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                    selected?.id === staff.id ? "bg-primary-50 border-l-4 border-primary-600" : ""
                  }`}
                >
                  <p className="font-medium text-sm">{staff.name}</p>
                  <p className="text-xs text-gray-500">{staff.monthly_earnings.toLocaleString()} SAR/mo</p>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="lg:col-span-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                  <p className="text-gray-500 text-sm">Monthly</p>
                  <p className="text-xl font-bold text-green-600">
                    {selected.monthly_earnings.toLocaleString()} SAR
                  </p>
                </div>
                <div className="card">
                  <p className="text-gray-500 text-sm">Year to Date</p>
                  <p className="text-xl font-bold text-primary-600">
                    {selected.yearly_earnings.toLocaleString()} SAR
                  </p>
                </div>
                <div className="card">
                  <p className="text-gray-500 text-sm">Quotations</p>
                  <p className="text-xl font-bold">{selected.quotation_count}</p>
                </div>
              </div>

              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">Quote</th>
                      <th className="pb-2 pr-4">Customer</th>
                      <th className="pb-2 pr-4 text-right">Total</th>
                      <th className="pb-2 pr-4 text-right">Commission</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.commissions.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/quotations/${c.quotation_id}`}
                            className="text-primary-600 hover:underline"
                          >
                            {c.quotation_id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{c.customer_name}</td>
                        <td className="py-2 pr-4 text-right">
                          {parseFloat(c.total_cost_sar || "0").toLocaleString()} SAR
                        </td>
                        <td className="py-2 pr-4 text-right font-medium text-green-700">
                          {parseFloat(c.commission_amount_sar).toLocaleString()} SAR
                        </td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
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
              </div>
            </div>
          ) : (
            <div className="lg:col-span-3 card text-gray-500">No commission records yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
