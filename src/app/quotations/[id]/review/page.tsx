"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function QuotationReviewPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [quotation, setQuotation] = useState<Record<string, unknown> | null>(null);
  const [profit, setProfit] = useState<Record<string, number> | null>(null);
  const [cost, setCost] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!["MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      router.push(`/quotations/${id}`);
      return;
    }

    Promise.all([
      apiFetch(`/api/quotations/${id}`).then((r) => r.json()),
      apiFetch(`/api/quotations/${id}/estimated-profit`).then((r) => r.json()),
      apiFetch(`/api/quotations/${id}/cost-breakdown`).then((r) => r.json()),
    ]).then(([detail, profitData, costData]) => {
      setQuotation(detail.quotation as Record<string, unknown>);
      setProfit(profitData);
      setCost(costData);
      setLoading(false);
    });
  }, [user, apiFetch, router, id]);

  async function approve() {
    if (!confirm("Approve quotation and trigger invoice + payment + email?")) return;
    const res = await apiFetch(`/api/quotations/${id}/approve`, { method: "PUT" });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message || "Approved");
      router.push(`/quotations/${id}`);
    } else {
      setMessage(data.error || "Failed");
    }
  }

  if (!user || loading) return <p className="p-6 text-gray-500">Loading review...</p>;
  if (!quotation) return <p className="p-6 text-red-600">Quotation not found</p>;

  const vb = cost?.breakdown as {
    hotel?: { vendor_name: string; total: number };
    transport?: { vendor_name: string; total: number };
    visa?: { vendor_name: string; total: number };
    total: number;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/quotations/${id}`} className="text-primary-600 text-sm hover:underline">
          ← Quotation
        </Link>
        <h1 className="text-2xl font-bold">Review Before Approval</h1>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">{message}</div>}

      <div className="card mb-6">
        <h2 className="font-semibold mb-2">{String(quotation.customer_name)}</h2>
        <p className="text-sm text-gray-600">Status: {String(quotation.status)}</p>
        <p className="text-sm text-gray-600">
          Total: {Number(quotation.total_cost_sar).toLocaleString()} SAR
        </p>
      </div>

      {vb && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">Vendor Costs</h2>
          <ul className="text-sm space-y-1">
            {vb.hotel && <li>Hotel ({vb.hotel.vendor_name}): {vb.hotel.total.toLocaleString()} SAR</li>}
            {vb.transport && <li>Transport ({vb.transport.vendor_name}): {vb.transport.total.toLocaleString()} SAR</li>}
            {vb.visa && <li>Visa ({vb.visa.vendor_name}): {vb.visa.total.toLocaleString()} SAR</li>}
            <li className="font-medium pt-2 border-t">Total: {vb.total.toLocaleString()} SAR</li>
          </ul>
        </div>
      )}

      {profit && (
        <div className="card mb-6 bg-purple-50 border-purple-200">
          <h2 className="font-semibold mb-3">Profit Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-600">Revenue</p><p className="font-bold">{Number(profit.revenue).toLocaleString()} SAR</p></div>
            <div><p className="text-gray-600">Costs</p><p className="font-bold text-red-600">{Number(profit.totalCost).toLocaleString()} SAR</p></div>
            <div><p className="text-gray-600">Gross Profit</p><p className="font-bold">{Number(profit.grossProfit).toLocaleString()} SAR</p></div>
            <div><p className="text-gray-600">Margin</p><p className="font-bold">{Number(profit.profitMargin).toFixed(1)}%</p></div>
            <div><p className="text-gray-600">Commission</p><p className="font-bold">{Number(profit.commission).toLocaleString()} SAR</p></div>
            <div><p className="text-gray-600">Company Profit</p><p className="font-bold text-green-700">{Number(profit.companyProfit).toLocaleString()} SAR</p></div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {String(quotation.status) !== "APPROVED" && (
          <button type="button" className="btn-primary" onClick={approve}>
            Approve Quotation
          </button>
        )}
        <Link href={`/quotations/${id}/edit`} className="btn-secondary">
          Edit First
        </Link>
      </div>
    </div>
  );
}
