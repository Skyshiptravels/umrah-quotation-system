"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface PaymentRow {
  id: string;
  invoice_number: string | null;
  amount_due: number;
  amount_paid: number;
  balance_due: number;
  payment_due_date: string | null;
  payment_received_date: string | null;
  status: string;
}

export default function ClientPaymentsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [clientName, setClientName] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [form, setForm] = useState({
    invoice_number: "",
    amount_due: "",
    amount_paid: "",
    payment_due_date: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [clientRes, payRes] = await Promise.all([
      apiFetch(`/api/clients/${clientId}`),
      apiFetch(`/api/clients/${clientId}/payments`),
    ]);
    const client = await clientRes.json();
    const pay = await payRes.json();
    if (client.client) setClientName(String(client.client.full_name));
    setPayments(pay.data || []);
  }, [apiFetch, clientId]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch(`/api/clients/${clientId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        invoice_number: form.invoice_number || undefined,
        amount_due: parseFloat(form.amount_due),
        amount_paid: form.amount_paid ? parseFloat(form.amount_paid) : 0,
        payment_due_date: form.payment_due_date || undefined,
      }),
    });
    setForm({ invoice_number: "", amount_due: "", amount_paid: "", payment_due_date: "" });
    await load();
    setSaving(false);
  }

  async function markPaid(paymentId: string) {
    await apiFetch(`/api/clients/${clientId}/payments`, {
      method: "POST",
      body: JSON.stringify({ action: "mark_paid", payment_id: paymentId }),
    });
    await load();
  }

  const totalOutstanding = payments.reduce((s, p) => s + Math.max(0, p.balance_due), 0);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/clients/${clientId}`} className="text-primary-600 text-sm hover:underline">
          ← {clientName || "Client"}
        </Link>
        <h1 className="text-2xl font-bold">Payment Tracking</h1>
      </div>

      <div className="card mb-6 bg-orange-50 border-orange-100">
        <p className="text-sm text-gray-600">Total Outstanding</p>
        <p className="text-2xl font-bold text-red-600">{totalOutstanding.toLocaleString()} SAR</p>
      </div>

      <form onSubmit={recordPayment} className="card mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="label">Invoice #</label>
          <input
            className="input"
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Amount Due SAR *</label>
          <input
            type="number"
            required
            step={0.01}
            className="input"
            value={form.amount_due}
            onChange={(e) => setForm({ ...form, amount_due: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Amount Paid</label>
          <input
            type="number"
            step={0.01}
            className="input"
            value={form.amount_paid}
            onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Due Date</label>
          <input
            type="date"
            className="input"
            value={form.payment_due_date}
            onChange={(e) => setForm({ ...form, payment_due_date: e.target.value })}
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Record Payment"}
        </button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-4 py-3">{p.invoice_number || "—"}</td>
                <td className="px-4 py-3">{p.amount_due.toLocaleString()} SAR</td>
                <td className="px-4 py-3">{p.amount_paid.toLocaleString()} SAR</td>
                <td className="px-4 py-3 font-medium text-red-600">
                  {p.balance_due.toLocaleString()} SAR
                </td>
                <td className="px-4 py-3">{p.payment_due_date || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      p.status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : p.status === "PARTIAL"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.status !== "PAID" && (
                    <button
                      type="button"
                      className="text-primary-600 text-xs hover:underline"
                      onClick={() => markPaid(p.id)}
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="p-8 text-center text-gray-500">No payments recorded</p>
        )}
      </div>
    </div>
  );
}
