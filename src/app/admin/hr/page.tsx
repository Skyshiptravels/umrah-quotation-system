"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HrPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Array<Record<string, unknown>>>([]);
  const [payroll, setPayroll] = useState<Array<Record<string, unknown>>>([]);
  const [processing, setProcessing] = useState(false);
  const monthYear = new Date().toLocaleString("en", { month: "short", year: "numeric" }).replace(" ", "-");

  const load = useCallback(async () => {
    const res = await apiFetch("/api/hr");
    const d = await res.json();
    setStaff(d.staff || []);
    const pRes = await apiFetch(`/api/hr?month=${encodeURIComponent(monthYear)}`);
    const p = await pRes.json();
    setPayroll(p.payroll || []);
  }, [apiFetch, monthYear]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function processPayroll() {
    setProcessing(true);
    await apiFetch("/api/hr", { method: "POST", body: JSON.stringify({ month_year: monthYear }) });
    await load();
    setProcessing(false);
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-primary-600 text-sm hover:underline">← Admin</Link>
          <h1 className="text-2xl font-bold">HR & Payroll</h1>
        </div>
        <button type="button" className="btn-primary text-sm" disabled={processing} onClick={processPayroll}>
          {processing ? "Processing..." : `Process Payroll (${monthYear})`}
        </button>
      </div>

      <div className="card mb-6 overflow-x-auto p-0">
        <h2 className="px-4 py-3 font-semibold border-b bg-gray-50">Staff</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Base Salary</th><th className="px-4 py-2">Commission %</th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={String(s.id)} className="border-b">
                <td className="px-4 py-2">{String(s.full_name)}</td>
                <td className="px-4 py-2">{String(s.role)}</td>
                <td className="px-4 py-2">{Number(s.base_salary).toLocaleString()} SAR</td>
                <td className="px-4 py-2">{Number(s.staff_margin_percent)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="px-4 py-3 font-semibold border-b bg-gray-50">Payroll — {monthYear}</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Staff</th><th className="px-4 py-2">Base</th><th className="px-4 py-2">Commission</th><th className="px-4 py-2">Net Pay</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody>
            {payroll.map((p) => (
              <tr key={String(p.id)} className="border-b">
                <td className="px-4 py-2">{String(p.full_name)}</td>
                <td className="px-4 py-2">{Number(p.base_salary).toLocaleString()}</td>
                <td className="px-4 py-2">{Number(p.commission_earned).toLocaleString()}</td>
                <td className="px-4 py-2 font-medium">{Number(p.net_pay).toLocaleString()}</td>
                <td className="px-4 py-2">{String(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payroll.length === 0 && <p className="p-6 text-gray-500 text-sm">Run payroll to generate salary records</p>}
      </div>
    </div>
  );
}
