"use client";

import { jsPDF } from "jspdf";

export interface InvoicePDFData {
  invoice_number: string;
  client_name: string;
  client_email?: string;
  issued_date: string;
  due_date: string;
  total_amount_sar: number;
  status: string;
  items: Array<{ description?: string; amount?: number }>;
  notes?: string;
}

export function generateInvoicePDF(data: InvoicePDFData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;

  const line = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(text, margin, y);
    y += size * 0.45 + 2;
  };

  line("SKYSHIP TRAVELS — INVOICE", 16, true);
  y += 2;
  line(`Invoice: ${data.invoice_number}`, 11, true);
  line(`Status: ${data.status}`);
  line(`Issued: ${data.issued_date}`);
  line(`Due: ${data.due_date}`);
  y += 4;
  line("Bill To", 11, true);
  line(data.client_name);
  if (data.client_email) line(data.client_email);
  y += 4;

  line("Items", 11, true);
  for (const item of data.items) {
    const desc = item.description || "Item";
    const amt = Number(item.amount || 0).toLocaleString();
    line(`${desc} — ${amt} SAR`);
  }
  y += 4;
  line(`TOTAL: ${data.total_amount_sar.toLocaleString()} SAR`, 12, true);

  if (data.notes) {
    y += 4;
    line(`Notes: ${data.notes}`, 9);
  }

  doc.save(`${data.invoice_number || "invoice"}.pdf`);
}

interface Props {
  data: InvoicePDFData;
}

export default function InvoicePDFDownload({ data }: Props) {
  return (
    <button
      type="button"
      className="btn-secondary text-sm"
      onClick={() => generateInvoicePDF(data)}
    >
      Download PDF
    </button>
  );
}
