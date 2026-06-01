"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function InvoicePage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    apiFetch(`/api/invoices/${quotationId}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setInvoice(data.invoice);
      })
      .finally(() => setLoading(false));
  }, [user, apiFetch, router, quotationId]);

  if (!user || loading) return <p className="p-6 text-gray-500">Loading invoice...</p>;
  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-gray-600 mb-4">No invoice found for this quotation.</p>
        <Link href={`/quotations/${quotationId}`} className="text-primary-600 hover:underline">
          ← Back to quotation
        </Link>
      </div>
    );
  }

  const items = (invoice.items as Array<Record<string, unknown>>) || [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/quotations/${quotationId}`} className="text-primary-600 text-sm hover:underline">
          ← Quotation
        </Link>
        <h1 className="text-2xl font-bold">Invoice {String(invoice.invoice_number || invoice.id).slice(0, 20)}</h1>
        <Link
          href={`/invoices/${quotationId}/pdf`}
          className="ml-auto text-sm px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700"
        >
          Download PDF
        </Link>
      </div>

      <div className="card space-y-4">
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-gray-500">Bill To</p>
            <p className="font-medium">{String(invoice.client_name || invoice.customer_name || "—")}</p>
            {Boolean(invoice.client_email) && (
              <p>{String(invoice.client_email)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-gray-500">Status</p>
            <p className="font-medium">{String(invoice.status)}</p>
            <p className="text-gray-500 mt-2">Due</p>
            <p>{invoice.due_date ? new Date(String(invoice.due_date)).toLocaleDateString() : "—"}</p>
          </div>
        </div>

        <table className="w-full text-sm border-t pt-4">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{String(item.description || "Item")}</td>
                <td className="py-2 text-right">{Number(item.amount || 0).toLocaleString()} SAR</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between font-bold text-lg border-t pt-4">
          <span>Total</span>
          <span>{Number(invoice.total_amount_sar).toLocaleString()} SAR</span>
        </div>

        {Boolean(invoice.notes) && (
          <p className="text-sm text-gray-600 border-t pt-3">{String(invoice.notes)}</p>
        )}
      </div>
    </div>
  );
}
