"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface PaymentRow {
  id: string;
  invoice_number: string | null;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: string;
  payment_method: string | null;
}

export default function VendorPaymentsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const vendorId = params.id as string;
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [form, setForm] = useState({
    invoice_number: "",
    amount: "",
    due_date: "",
    payment_method: "BANK_TRANSFER",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [vRes, pRes] = await Promise.all([
      apiFetch(`/api/vendors/${vendorId}`),
      apiFetch(`/api/vendors/${vendorId}/payments`),
    ]);
    const v = await vRes.json();
    const p = await pRes.json();
    if (v.vendor) setVendorName(v.vendor.name);
    setPayments(p.data || []);
  }, [apiFetch, vendorId]);

  useEffect(() => {
    if (!user || !["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch(`/api/vendors/${vendorId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        invoice_number: form.invoice_number,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        payment_method: form.payment_method,
        notes: form.notes,
        status: "PENDING",
      }),
    });
    setForm({ invoice_number: "", amount: "", due_date: "", payment_method: "BANK_TRANSFER", notes: "" });
    await load();
    setSaving(false);
  }

  async function markPaid(paymentId: string) {
    await apiFetch(`/api/vendors/${vendorId}/payments`, {
      method: "POST",
      body: JSON.stringify({ action: "mark_paid", payment_id: paymentId }),
    });
    await load();
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/vendors/${vendorId}`} className="text-primary-600 text-sm hover:underline">
          ← {vendorName || "Vendor"}
        </Link>
        <h1 className="text-2xl font-bold">Payment Tracking</h1>
      </div>

      {["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role) && (
        <form onSubmit={recordPayment} className="card mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">Invoice #</label>
            <input className="input" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
          </div>
          <div>
            <label className="label">Amount SAR *</label>
            <input type="number" required step={0.01} className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Record Payment"}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-4 py-3">{p.invoice_number || "—"}</td>
                <td className="px-4 py-3 font-medium">{p.amount.toLocaleString()} SAR</td>
                <td className="px-4 py-3">{p.due_date || "—"}</td>
                <td className="px-4 py-3">{p.paid_date || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${p.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.status !== "PAID" && (
                    <button type="button" className="text-primary-600 text-xs hover:underline" onClick={() => markPaid(p.id)}>
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <p className="p-8 text-center text-gray-500">No payments recorded</p>}
      </div>
    </div>
  );
}
