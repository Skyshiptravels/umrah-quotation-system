"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PDFQuotation, { PDFQuotationData } from "@/components/quotation/PDFQuotation";

interface ProfitData {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  commission: number;
  companyProfit: number;
  vendor_breakdown?: {
    hotel?: { vendor_name: string; total: number } | null;
    transport?: { vendor_name: string; total: number } | null;
    visa?: { vendor_name: string; total: number } | null;
    total: number;
  };
}

export default function QuotationDetailPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [profit, setProfit] = useState<ProfitData | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveMsg, setApproveMsg] = useState("");

  const loadAll = useCallback(async () => {
    const [detail, summary, profitRes, costRes] = await Promise.all([
      apiFetch(`/api/quotations/${id}`).then((r) => r.json()),
      apiFetch(`/api/quotations/${id}/summary`).then((r) => r.json()),
      apiFetch(`/api/quotations/${id}/estimated-profit`).then((r) => r.json()),
      apiFetch(`/api/quotations/${id}/cost-breakdown`).then((r) => r.json()),
    ]);
    setData({ ...detail, summary });
    if (profitRes.revenue != null) setProfit(profitRes);
    if (costRes.breakdown) setCostBreakdown(costRes);
    setLoading(false);
  }, [apiFetch, id]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    void loadAll();
  }, [user, router, loadAll]);

  async function handleCalculate() {
    await apiFetch(`/api/quotations/${id}/calculate`, { method: "POST" });
    await loadAll();
  }

  async function handleApprove() {
    if (!confirm("Approve this quotation? Invoice, payment record, and email will be generated.")) {
      return;
    }
    const res = await apiFetch(`/api/quotations/${id}/approve`, { method: "POST" });
    const body = await res.json();
    if (res.ok) {
      setApproveMsg(body.message || "Approved successfully");
      await loadAll();
    } else {
      setApproveMsg(body.error || "Approval failed");
    }
  }

  const pdfData = useMemo((): PDFQuotationData | null => {
    if (!data?.quotation) return null;
    const q = data.quotation as Record<string, unknown>;
    const breakdown = (data.summary as { breakdown?: Record<string, number> })?.breakdown;
    const hotels = (data.hotels as PDFQuotationData["hotels"]) || [];
    const transport = (data.transport as PDFQuotationData["transport"]) || [];
    const visas = data.visas as Array<{ visa_name?: string }> | undefined;

    return {
      id: String(q.id),
      customer_name: String(q.customer_name),
      customer_email: String(q.customer_email || ""),
      customer_phone: String(q.customer_phone || ""),
      customer_whatsapp: String(q.customer_whatsapp || ""),
      created_at: String(q.created_at || ""),
      expiry_date: String(q.expiry_date || ""),
      adults: Number(q.adults),
      children_with_bed: Number(q.children_with_bed),
      children_without_bed: Number(q.children_without_bed),
      infants: Number(q.infants),
      air_ticket_adult_pkr: Number(q.air_ticket_adult_pkr),
      air_ticket_child_pkr: Number(q.air_ticket_child_pkr),
      air_ticket_infant_pkr: Number(q.air_ticket_infant_pkr),
      flights_cost_pkr: Number(breakdown?.flights_cost_pkr ?? q.flights_cost_pkr),
      total_cost_sar: Number(breakdown?.total_cost_sar ?? q.total_cost_sar),
      total_cost_pkr: Number(breakdown?.total_cost_pkr ?? q.total_cost_pkr),
      hotel_cost_sar: Number(breakdown?.hotel_cost_sar ?? q.hotel_cost_sar),
      transport_cost_sar: Number(breakdown?.transport_cost_sar ?? q.transport_cost_sar),
      visa_cost_sar: Number(breakdown?.visa_cost_sar ?? q.visa_cost_sar),
      hotels,
      transport,
      visa_name: visas?.[0]?.visa_name,
    };
  }, [data]);

  if (!user || loading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (!data) return <p className="p-6 text-red-600">Not found</p>;

  const summary = data.summary as Record<string, Record<string, number>>;
  const breakdown = summary?.breakdown;
  const quotation = data.quotation as Record<string, string>;
  const canEdit = ["DRAFT", "PENDING"].includes(quotation.status);
  const vb = costBreakdown?.breakdown as ProfitData["vendor_breakdown"] | undefined;
  const clientId = costBreakdown?.client_id as string | undefined;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{quotation.customer_name}</h1>
          <p className="text-gray-500">{quotation.customer_email}</p>
          {clientId && (
            <Link href={`/admin/clients/${clientId}`} className="text-primary-600 text-sm hover:underline">
              View linked client →
            </Link>
          )}
          <span className="inline-block mt-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
            {quotation.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {pdfData && <PDFQuotation data={pdfData} />}
          {canEdit && (
            <>
              <Link href={`/quotations/${id}/edit`} className="btn-primary text-sm">
                Edit
              </Link>
              <Link href={`/quotations/${id}/review`} className="btn-secondary text-sm">
                Review & Approve
              </Link>
            </>
          )}
          {quotation.status === "APPROVED" && (
            <Link href={`/invoices/${id}`} className="btn-secondary text-sm">
              View Invoice
            </Link>
          )}
          <button type="button" className="btn-secondary text-sm" onClick={handleCalculate}>
            Recalculate
          </button>
          {["MANAGER", "SUPER_ADMIN"].includes(user.role) && quotation.status !== "APPROVED" && (
            <button type="button" className="btn-primary text-sm" onClick={handleApprove}>
              Approve
            </button>
          )}
        </div>
      </div>

      {approveMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded text-sm">{approveMsg}</div>
      )}

      {vb && (vb.hotel || vb.transport || vb.visa) && (
        <div className="card mb-6 bg-green-50 border-green-100">
          <h2 className="font-semibold mb-3">Vendor Cost Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {vb.hotel && (
              <div className="bg-white rounded p-3 border">
                <p className="text-gray-500 text-xs">Hotel</p>
                <p className="font-medium">{vb.hotel.vendor_name}</p>
                <p>{vb.hotel.total.toLocaleString()} SAR</p>
              </div>
            )}
            {vb.transport && (
              <div className="bg-white rounded p-3 border">
                <p className="text-gray-500 text-xs">Transport</p>
                <p className="font-medium">{vb.transport.vendor_name}</p>
                <p>{vb.transport.total.toLocaleString()} SAR</p>
              </div>
            )}
            {vb.visa && (
              <div className="bg-white rounded p-3 border">
                <p className="text-gray-500 text-xs">Visa</p>
                <p className="font-medium">{vb.visa.vendor_name}</p>
                <p>{vb.visa.total.toLocaleString()} SAR</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-sm font-medium text-red-700">
            Total vendor cost: {Number(vb.total || 0).toLocaleString()} SAR
          </p>
        </div>
      )}

      {profit && (
        <div className="card mb-6 bg-purple-50 border-purple-200">
          <h2 className="font-semibold mb-3">Profit Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Revenue</p>
              <p className="text-xl font-bold text-green-700">{profit.revenue.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600">Vendor Cost</p>
              <p className="text-xl font-bold text-red-600">{profit.totalCost.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600">Gross Profit</p>
              <p className="text-xl font-bold text-blue-700">{profit.grossProfit.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600">Margin</p>
              <p className="text-xl font-bold">{profit.profitMargin.toFixed(1)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-purple-200 text-sm">
            <div>
              <p className="text-gray-600">Staff Commission</p>
              <p className="font-bold">{profit.commission.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600">Company Profit</p>
              <p className="font-bold text-green-700">{profit.companyProfit.toLocaleString()} SAR</p>
            </div>
          </div>
        </div>
      )}

      {breakdown && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Selling Price Breakdown (SAR)</h2>
            <dl className="space-y-2 text-sm">
              {[
                ["Hotels", breakdown.hotel_cost_sar],
                ["Transport", breakdown.transport_cost_sar],
                ["Visa", breakdown.visa_cost_sar],
                ...(breakdown.upgrades_cost_sar
                  ? [["Upgrades", breakdown.upgrades_cost_sar] as const]
                  : []),
                ["Transfers", breakdown.transfers_cost_sar],
                ["Subtotal", breakdown.subtotal_sar],
                ["Discount", breakdown.discount_amount_sar],
                ["Grand Total SAR", breakdown.total_cost_sar],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-gray-600">{label}</dt>
                  <dd className="font-medium">{Number(value).toLocaleString()} SAR</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">PKR Totals</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Visa PKR</dt>
                <dd>{(breakdown.visa_cost_sar * breakdown.currency_rate).toLocaleString()} PKR</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Flights PKR</dt>
                <dd>{Number(breakdown.flights_cost_pkr).toLocaleString()} PKR</dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <dt>Grand Total PKR</dt>
                <dd className="text-primary-600">
                  {Number(breakdown.total_cost_pkr).toLocaleString()} PKR
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
