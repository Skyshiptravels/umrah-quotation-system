"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import InvoicePDFDownload, { InvoicePDFData } from "@/components/invoice/InvoicePDFDownload";

export default function InvoicePDFPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  const [pdfData, setPdfData] = useState<InvoicePDFData | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    apiFetch(`/api/invoices/${quotationId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.invoice) return;
        const inv = data.invoice;
        setPdfData({
          invoice_number: String(inv.invoice_number || inv.id),
          client_name: String(inv.client_name || inv.customer_name || "Client"),
          client_email: inv.client_email ? String(inv.client_email) : undefined,
          issued_date: String(inv.issued_date || ""),
          due_date: String(inv.due_date || ""),
          total_amount_sar: Number(inv.total_amount_sar),
          status: String(inv.status),
          items: (inv.items as InvoicePDFData["items"]) || [],
          notes: inv.notes ? String(inv.notes) : undefined,
        });
      });
  }, [user, apiFetch, router, quotationId]);

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto p-6">
      <Link href={`/invoices/${quotationId}`} className="text-primary-600 text-sm hover:underline">
        ← Invoice
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Invoice PDF</h1>
      {pdfData ? (
        <div className="card space-y-4">
          <p className="text-sm text-gray-600">
            Generate a PDF for invoice <strong>{pdfData.invoice_number}</strong>
          </p>
          <InvoicePDFDownload data={pdfData} />
        </div>
      ) : (
        <p className="text-gray-500">Invoice not found for this quotation.</p>
      )}
    </div>
  );
}
