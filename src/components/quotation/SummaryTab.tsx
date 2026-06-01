"use client";

import { useState } from "react";
import { formatDisplayDate, getExpiryDate } from "@/lib/quotation-form-calculations";
import type { FormCostPreview } from "@/lib/quotation-form-calculations";

interface Props {
  preview: FormCostPreview;
  showBreakdownDefault?: boolean;
}

export default function SummaryTab({ preview, showBreakdownDefault = false }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(showBreakdownDefault);
  const expiry = getExpiryDate();

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border rounded-xl p-6 space-y-3">
        <h3 className="text-lg font-bold text-gray-900">Quotation Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Hotels</span>
            <span className="font-medium">{preview.hotelCostSar.toLocaleString()} SAR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Transport</span>
            <span className="font-medium">{preview.transportCostSar.toLocaleString()} SAR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Visa</span>
            <span className="font-medium">{preview.visaCostSar.toLocaleString()} SAR</span>
          </div>
          {preview.upgradesCostSar > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Upgrades</span>
              <span className="font-medium">{preview.upgradesCostSar.toLocaleString()} SAR</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>SUBTOTAL</span>
            <span>{preview.subtotalSar.toLocaleString()} SAR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Air Tickets</span>
            <span className="font-medium">{preview.airTicketsPkr.toLocaleString()} PKR</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold text-primary-700">
            <span>GRAND TOTAL</span>
            <span>
              {preview.grandTotalSar.toLocaleString()} SAR + {preview.grandTotalPkr.toLocaleString()} PKR
            </span>
          </div>
          <p className="text-xs text-gray-500 pt-2">
            Valid Until: {formatDisplayDate(expiry)} (2 days from today)
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={showBreakdown}
          onChange={(e) => setShowBreakdown(e.target.checked)}
        />
        Show Breakdown (Detailed Calculation Rates)
      </label>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          showBreakdown ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border rounded-xl p-5 bg-white text-sm space-y-4">
          <div>
            <h4 className="font-semibold mb-2">HOTELS</h4>
            {preview.hotelBreakdown.map((h, i) => (
              <p key={i} className="text-gray-600">{h.label} = {h.cost.toLocaleString()} SAR</p>
            ))}
          </div>
          <div>
            <h4 className="font-semibold mb-2">TRANSPORT</h4>
            {preview.transportBreakdown.map((t, i) => (
              <p key={i} className="text-gray-600">{t.label}: {t.cost.toLocaleString()} SAR</p>
            ))}
          </div>
          <div>
            <h4 className="font-semibold mb-2">VISA</h4>
            <p className="text-gray-600">
              {preview.visaCostSar.toLocaleString()} SAR ({preview.visaCostPkr.toLocaleString()} PKR)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
