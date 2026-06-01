"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface InvoiceRow {
  id: string;
  quotation_id: string;
  invoice_number: string | null;
  client_name: string | null;
  customer_name: string;
  total_amount_sar: number;
  status: string;
  issued_date: string;
  due_date: string;
}

export default function AdminInvoicesPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    apiFetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.data || []))
      .finally(() => setLoading(false));
  }, [user, router, apiFetch]);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/financial" className="text-primary-600 text-sm hover:underline">
          ← Financial
        </Link>
        <h1 className="text-2xl font-bold">Invoice Management</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading invoices...</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{inv.invoice_number || "—"}</td>
                  <td className="px-4 py-3">{inv.client_name || inv.customer_name}</td>
                  <td className="px-4 py-3">{inv.total_amount_sar.toLocaleString()} SAR</td>
                  <td className="px-4 py-3">
                    {inv.issued_date
                      ? new Date(String(inv.issued_date)).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {inv.due_date ? new Date(String(inv.due_date)).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <Link
                      href={`/invoices/${inv.quotation_id}`}
                      className="text-primary-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                    <Link
                      href={`/invoices/${inv.quotation_id}/pdf`}
                      className="text-primary-600 hover:underline text-xs"
                    >
                      PDF
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <p className="p-8 text-center text-gray-500">
              No invoices yet — approve quotations to auto-generate invoices
            </p>
          )}
        </div>
      )}
    </div>
  );
}
