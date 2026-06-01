"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isConfigAdminRole } from "@/lib/admin-access";

interface HistoryRow {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_email: string | null;
  changed_at: string;
}

export default function VisaHistoryPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const visaId = params.id as string;
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isConfigAdminRole(user.role)) {
      router.push("/dashboard");
      return;
    }

    apiFetch(`/api/admin/visa/categories/${visaId}/history`)
      .then((r) => r.json())
      .then((d) => setHistory(d.data || []))
      .finally(() => setLoading(false));
  }, [user, router, apiFetch, visaId]);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/visa" className="text-primary-600 text-sm hover:underline">
          ← Visa
        </Link>
        <h1 className="text-2xl font-bold">Rate Change History</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Old Value</th>
                <th className="px-4 py-3">New Value</th>
                <th className="px-4 py-3">Changed By</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{log.field_changed}</td>
                  <td className="px-4 py-3 text-gray-600">{log.old_value ?? "—"}</td>
                  <td className="px-4 py-3">{log.new_value ?? "—"}</td>
                  <td className="px-4 py-3">{log.changed_by_email || "—"}</td>
                  <td className="px-4 py-3">{new Date(log.changed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <p className="p-8 text-center text-gray-500">No changes recorded yet</p>
          )}
        </div>
      )}
    </div>
  );
}
