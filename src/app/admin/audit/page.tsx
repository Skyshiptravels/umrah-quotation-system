"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuditLogsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<Array<Record<string, string>>>([]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") { router.push("/dashboard"); return; }
    apiFetch("/api/admin/audit").then((r) => r.json()).then((d) => setLogs(d.data || []));
  }, [user, router, apiFetch]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">Time</th>
              <th className="pb-2">User</th>
              <th className="pb-2">Action</th>
              <th className="pb-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="py-2">{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.user_email}</td>
                <td>{l.action}</td>
                <td>{l.entity_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
