"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ImportRow {
  email: string;
  full_name: string;
  role: string;
  commission_rate: number;
}

export default function ImportUsersPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<{ created: string[]; errors: string[] } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  if (!user || user.role !== "SUPER_ADMIN") {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  function parseCsv() {
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      alert("Paste CSV with header row: email,full_name,role,commission_rate");
      return;
    }
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const [email, full_name, role, commission_rate] = lines[i]
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""));
      if (!email) continue;
      rows.push({
        email,
        full_name: full_name || email.split("@")[0],
        role: role || "STAFF",
        commission_rate: parseFloat(commission_rate) || 10,
      });
    }
    setPreview(rows);
    setResult(null);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users/import", {
        method: "POST",
        body: JSON.stringify({ users: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({ created: data.created || [], errors: data.errors || [] });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users" className="text-primary-600 text-sm hover:underline">
          ← Users
        </Link>
        <h1 className="text-2xl font-bold">Bulk Import Users</h1>
      </div>

      <div className="card max-w-3xl space-y-4">
        <p className="text-sm text-gray-600">
          Paste CSV with columns:{" "}
          <code className="bg-gray-100 px-1 rounded">email,full_name,role,commission_rate</code>
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={8}
          className="input font-mono text-sm"
          placeholder={`email,full_name,role,commission_rate\nagent@umrah.com,Jane Agent,AGENT,12`}
        />
        <div className="flex gap-3">
          <button type="button" onClick={parseCsv} className="btn-secondary">
            Preview
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || preview.length === 0}
            className="btn-primary"
          >
            {loading ? "Importing..." : `Import ${preview.length} users`}
          </button>
          <button type="button" onClick={() => router.push("/admin/users")} className="btn-secondary">
            Done
          </button>
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Email</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Commission %</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.email} className="border-b">
                    <td className="py-2">{r.email}</td>
                    <td>{r.full_name}</td>
                    <td>{r.role}</td>
                    <td>{r.commission_rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="text-sm space-y-2">
            <p className="text-green-700">Created: {result.created.length}</p>
            {result.errors.length > 0 && (
              <ul className="text-red-600 list-disc pl-5">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
