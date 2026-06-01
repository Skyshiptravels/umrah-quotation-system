"use client";

import { jsPDF } from "jspdf";

export interface PDFQuotationData {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_whatsapp?: string;
  created_at?: string;
  expiry_date?: string;
  adults: number;
  children_with_bed: number;
  children_without_bed: number;
  infants: number;
  air_ticket_adult_pkr?: number;
  air_ticket_child_pkr?: number;
  air_ticket_infant_pkr?: number;
  flights_cost_pkr?: number;
  total_cost_sar: number;
  total_cost_pkr: number;
  hotel_cost_sar?: number;
  transport_cost_sar?: number;
  visa_cost_sar?: number;
  hotels?: Array<{
    hotel_name?: string;
    city: string;
    check_in_date: string;
    nights: number;
    room_type_1?: string | null;
    quantity_1?: number;
    booking_mode?: string;
    subtotal_sar?: number | string;
  }>;
  transport?: Array<{
    route_name?: string;
    vehicle_type: string;
    total_cost_sar?: number | string;
  }>;
  visa_name?: string;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d.includes("T") ? d : `${d}T00:00:00`).toLocaleDateString("en-GB");
}

function fmtNum(n?: number | string) {
  return Number(n || 0).toLocaleString();
}

export function generateQuotationPDF(data: PDFQuotationData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;

  const line = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, 182);
    if (y + lines.length * 5 > 285) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  };

  doc.setTextColor(37, 99, 235);
  line("SKYSHIP TRAVELS", 18, true);
  doc.setTextColor(60, 60, 60);
  line("Umrah & Hajj Quotations", 11);
  y += 2;
  doc.setTextColor(0, 0, 0);
  line(`Quote #: ${data.id.slice(0, 8).toUpperCase()}`, 10, true);
  line(`Date: ${fmtDate(data.created_at)}`);
  line(`Valid until: ${fmtDate(data.expiry_date)}`);
  y += 4;

  line("Customer Details", 12, true);
  line(`Name: ${data.customer_name}`);
  if (data.customer_email) line(`Email: ${data.customer_email}`);
  if (data.customer_phone) line(`Phone: ${data.customer_phone}`);
  if (data.customer_whatsapp) line(`WhatsApp: ${data.customer_whatsapp}`);
  y += 2;

  const totalPax =
    data.adults + data.children_with_bed + data.children_without_bed + data.infants;
  line("Passengers", 12, true);
  line(
    `Adults: ${data.adults} | Children (bed): ${data.children_with_bed} | Children (no bed): ${data.children_without_bed} | Infants: ${data.infants}`
  );
  line(`Total passengers: ${totalPax}`);
  y += 2;

  if (data.hotels?.length) {
    line("Hotels", 12, true);
    for (const h of data.hotels) {
      const mode = h.booking_mode === "SHARING" ? "Sharing" : h.room_type_1 || "Room";
      line(
        `• ${h.hotel_name || "Hotel"} (${h.city}) — ${fmtDate(String(h.check_in_date))}, ${h.nights} nights, ${mode}: ${fmtNum(h.subtotal_sar)} SAR`
      );
    }
    line(`Hotels subtotal: ${fmtNum(data.hotel_cost_sar)} SAR`, 10, true);
    y += 2;
  }

  if (data.transport?.length) {
    line("Transport", 12, true);
    for (const t of data.transport) {
      line(
        `• ${t.route_name || "Route"} — ${t.vehicle_type}: ${fmtNum(t.total_cost_sar)} SAR`
      );
    }
    line(`Transport subtotal: ${fmtNum(data.transport_cost_sar)} SAR`, 10, true);
    y += 2;
  }

  if (data.visa_name) {
    line("Visa", 12, true);
    line(`${data.visa_name}: ${fmtNum(data.visa_cost_sar)} SAR`);
    y += 2;
  }

  line("Air Tickets (PKR)", 12, true);
  if (data.air_ticket_adult_pkr)
    line(`Adults: ${fmtNum(data.air_ticket_adult_pkr)} PKR × ${data.adults}`);
  const children = data.children_with_bed + data.children_without_bed;
  if (data.air_ticket_child_pkr && children)
    line(`Children: ${fmtNum(data.air_ticket_child_pkr)} PKR × ${children}`);
  if (data.air_ticket_infant_pkr && data.infants)
    line(`Infants: ${fmtNum(data.air_ticket_infant_pkr)} PKR × ${data.infants}`);
  line(`Flights total: ${fmtNum(data.flights_cost_pkr)} PKR`, 10, true);
  y += 4;

  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y, 196, y);
  y += 6;
  line(`Grand Total (SAR): ${fmtNum(data.total_cost_sar)} SAR`, 12, true);
  line(`Grand Total (PKR): ${fmtNum(data.total_cost_pkr)} PKR`, 12, true);
  y += 6;

  line("Terms & Conditions", 11, true);
  line(`• Valid until ${fmtDate(data.expiry_date)}`);
  line("• Prices subject to change after expiry");
  line("• 50% advance required to confirm booking");
  line("• Balance due 15 days before travel");
  y += 4;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  line("SKYSHIP TRAVELS | admin@skyshiptravels.com | www.skyshiptravels.com");
  line("Computer-generated quotation. No signature required.");

  doc.save(`quotation-${data.id.slice(0, 8)}.pdf`);
}

interface PDFQuotationProps {
  data: PDFQuotationData;
  className?: string;
}

export default function PDFQuotation({ data, className = "" }: PDFQuotationProps) {
  return (
    <button
      type="button"
      className={`btn-secondary ${className}`}
      onClick={() => generateQuotationPDF(data)}
    >
      Download PDF
    </button>
  );
}
