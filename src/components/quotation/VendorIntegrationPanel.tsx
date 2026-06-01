"use client";

import { useCallback, useEffect, useState } from "react";
import { totalPassengers } from "@/lib/quotation-form-calculations";
import { QuotationFormState } from "@/types/quotation-form";

interface VendorOption {
  id: string;
  name: string;
  type: string;
}

interface ProfitPreview {
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

interface Props {
  form: QuotationFormState;
  revenueSar: number;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onChange: (patch: Partial<QuotationFormState>) => void;
}

export default function VendorIntegrationPanel({
  form,
  revenueSar,
  apiFetch,
  onChange,
}: Props) {
  const [vendors, setVendors] = useState<Record<string, VendorOption[]>>({});
  const [profit, setProfit] = useState<ProfitPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all(
      ["HOTEL", "TRANSPORT", "VISA"].map((type) =>
        apiFetch(`/api/vendors?type=${type}`).then((r) => r.json())
      )
    ).then(([h, t, v]) => {
      setVendors({
        HOTEL: h.data || [],
        TRANSPORT: t.data || [],
        VISA: v.data || [],
      });
    });
  }, [apiFetch]);

  const refreshProfit = useCallback(async () => {
    if (!form.hotelVendorId && !form.transportVendorId && !form.visaVendorId) {
      setProfit(null);
      return;
    }
    setLoading(true);
    const pax = totalPassengers(form);
    const nights = form.hotels.reduce((s, h) => s + (h.nights || 0), 0) || 1;
    try {
      const res = await apiFetch("/api/quotations/estimate-profit", {
        method: "POST",
        body: JSON.stringify({
          total_price_sar: revenueSar,
          total_pax: pax,
          nights,
          hotel_vendor_id: form.hotelVendorId || undefined,
          transport_vendor_id: form.transportVendorId || undefined,
          visa_vendor_id: form.visaVendorId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) setProfit(data);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, form, revenueSar]);

  useEffect(() => {
    void refreshProfit();
  }, [
    form.hotelVendorId,
    form.transportVendorId,
    form.visaVendorId,
    revenueSar,
    refreshProfit,
  ]);

  return (
    <div className="card space-y-4 bg-green-50 border-green-100">
      <h3 className="font-semibold text-gray-900">Vendor Selection & Costs</h3>
      <p className="text-xs text-gray-600">
        Select vendors to auto-fetch current rates and estimate profit before approval.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Hotel Vendor</label>
          <select
            className="input text-sm"
            value={form.hotelVendorId}
            onChange={(e) => onChange({ hotelVendorId: e.target.value })}
          >
            <option value="">— None —</option>
            {(vendors.HOTEL || []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Transport Vendor</label>
          <select
            className="input text-sm"
            value={form.transportVendorId}
            onChange={(e) => onChange({ transportVendorId: e.target.value })}
          >
            <option value="">— None —</option>
            {(vendors.TRANSPORT || []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Visa Vendor</label>
          <select
            className="input text-sm"
            value={form.visaVendorId}
            onChange={(e) => onChange({ visaVendorId: e.target.value })}
          >
            <option value="">— None —</option>
            {(vendors.VISA || []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-xs text-gray-500">Calculating vendor costs...</p>}

      {profit && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm space-y-3">
          <h4 className="font-semibold">Estimated Profit (before approval)</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-gray-600 text-xs">Revenue</p>
              <p className="font-bold text-green-700">{profit.revenue.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Vendor Costs</p>
              <p className="font-bold text-red-600">{profit.totalCost.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Gross Profit</p>
              <p className="font-bold text-blue-700">{profit.grossProfit.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Margin</p>
              <p className="font-bold">{profit.profitMargin.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Staff Commission</p>
              <p className="font-bold">{profit.commission.toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Company Profit</p>
              <p className="font-bold text-green-700">{profit.companyProfit.toLocaleString()} SAR</p>
            </div>
          </div>
          {profit.vendor_breakdown && (
            <div className="text-xs text-gray-600 pt-2 border-t border-purple-200">
              {profit.vendor_breakdown.hotel && (
                <p>Hotel: {profit.vendor_breakdown.hotel.vendor_name} — {profit.vendor_breakdown.hotel.total.toLocaleString()} SAR</p>
              )}
              {profit.vendor_breakdown.transport && (
                <p>Transport: {profit.vendor_breakdown.transport.vendor_name} — {profit.vendor_breakdown.transport.total.toLocaleString()} SAR</p>
              )}
              {profit.vendor_breakdown.visa && (
                <p>Visa: {profit.vendor_breakdown.visa.vendor_name} — {profit.vendor_breakdown.visa.total.toLocaleString()} SAR</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export async function fetchVendorBreakdownForForm(
  apiFetch: Props["apiFetch"],
  form: QuotationFormState,
  revenueSar: number
) {
  if (!form.hotelVendorId && !form.transportVendorId && !form.visaVendorId) {
    return null;
  }
  const pax = totalPassengers(form);
  const nights = form.hotels.reduce((s, h) => s + (h.nights || 0), 0) || 1;
  const res = await apiFetch("/api/quotations/estimate-profit", {
    method: "POST",
    body: JSON.stringify({
      total_price_sar: revenueSar,
      total_pax: pax,
      nights,
      hotel_vendor_id: form.hotelVendorId || undefined,
      transport_vendor_id: form.transportVendorId || undefined,
      visa_vendor_id: form.visaVendorId || undefined,
    }),
  });
  const data = await res.json();
  return res.ok ? (data.vendor_breakdown as Record<string, unknown>) : null;
}
