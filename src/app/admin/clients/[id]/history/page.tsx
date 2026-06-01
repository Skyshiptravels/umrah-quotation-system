"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ClientHistoryPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [clientName, setClientName] = useState("");
  const [quotations, setQuotations] = useState<Array<Record<string, unknown>>>([]);
  const [communications, setCommunications] = useState<Array<Record<string, unknown>>>([]);
  const [commForm, setCommForm] = useState({
    communication_type: "EMAIL",
    subject: "",
    message: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [clientRes, quotRes, commRes] = await Promise.all([
      apiFetch(`/api/clients/${clientId}`),
      apiFetch(`/api/clients/${clientId}/quotations`),
      apiFetch(`/api/clients/${clientId}/communication`),
    ]);
    const client = await clientRes.json();
    const quot = await quotRes.json();
    const comm = await commRes.json();
    if (client.client) setClientName(String(client.client.full_name));
    setQuotations(quot.data || []);
    setCommunications(comm.data || []);
  }, [apiFetch, clientId]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    void load();
  }, [user, router, load]);

  async function logCommunication(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch(`/api/clients/${clientId}/communication`, {
      method: "POST",
      body: JSON.stringify(commForm),
    });
    setCommForm({ communication_type: "EMAIL", subject: "", message: "", notes: "" });
    await load();
    setSaving(false);
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/clients/${clientId}`} className="text-primary-600 text-sm hover:underline">
          ← {clientName || "Client"}
        </Link>
        <h1 className="text-2xl font-bold">Full History</h1>
      </div>

      {["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT"].includes(user.role) && (
        <form onSubmit={logCommunication} className="card mb-6 space-y-3">
          <h2 className="font-semibold">Log Communication</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="input"
              value={commForm.communication_type}
              onChange={(e) => setCommForm({ ...commForm, communication_type: e.target.value })}
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone Call</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MEETING">Meeting</option>
            </select>
            <input
              className="input md:col-span-3"
              placeholder="Subject"
              value={commForm.subject}
              onChange={(e) => setCommForm({ ...commForm, subject: e.target.value })}
            />
          </div>
          <textarea
            className="input min-h-[80px]"
            placeholder="Message / call summary"
            required
            value={commForm.message}
            onChange={(e) => setCommForm({ ...commForm, message: e.target.value })}
          />
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving..." : "Log Communication"}
          </button>
        </form>
      )}

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Communication Log</h2>
        {communications.length === 0 ? (
          <p className="text-sm text-gray-500">No communications logged</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {communications.map((c) => (
              <li key={String(c.id)} className="border-b pb-3">
                <div className="flex flex-wrap gap-2 text-gray-500 text-xs mb-1">
                  <span className="font-medium text-gray-800">{String(c.communication_type)}</span>
                  <span>{new Date(String(c.sent_at)).toLocaleString()}</span>
                  {Boolean(c.sent_by_name) && (
                    <span>by {String(c.sent_by_name)}</span>
                  )}
                </div>
                {Boolean(c.subject) && (
                  <p className="font-medium">{String(c.subject)}</p>
                )}
                <p className="text-gray-600">{String(c.message || "")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">All Quotations</h2>
        {quotations.length === 0 ? (
          <p className="text-sm text-gray-500">No quotations</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Customer</th>
                <th className="py-2">Created</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={String(q.id)} className="border-b">
                  <td className="py-2">
                    <Link href={`/quotations/${q.id}`} className="text-primary-600 hover:underline">
                      {String(q.customer_name)}
                    </Link>
                  </td>
                  <td className="py-2">{new Date(String(q.created_at)).toLocaleDateString()}</td>
                  <td className="py-2">{Number(q.total_cost_sar).toLocaleString()} SAR</td>
                  <td className="py-2">{String(q.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
