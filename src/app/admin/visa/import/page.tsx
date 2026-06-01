"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isConfigAdminRole } from "@/lib/admin-access";

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseVisaCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));

  const codeI = idx(["code"]);
  const nameI = idx(["name"]);
  const adultI = idx(["adult", "child sar"]);
  const infantI = idx(["infant"]);
  const procI = idx(["processing"]);
  const validI = idx(["validity"]);
  const docsI = idx(["document"]);
  const specialI = idx(["special", "condition"]);
  const commI = idx(["commission"]);
  const statusI = idx(["status"]);
  const summerI = idx(["summer"]);
  const winterI = idx(["winter"]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    const code = cells[codeI];
    const name = cells[nameI];
    if (!code || !name) continue;

    rows.push({
      code,
      name,
      adult_child_rate_sar: parseFloat(cells[adultI]) || 0,
      infant_rate_sar: parseFloat(cells[infantI]) || 490,
      processing_time_days: parseInt(cells[procI], 10) || 3,
      validity_days: parseInt(cells[validI], 10) || 28,
      documents_required: cells[docsI]
        ? cells[docsI].split(";").map((d) => d.trim()).filter(Boolean)
        : ["Passport", "Photo"],
      special_conditions: cells[specialI] || "",
      commission_percent: parseFloat(cells[commI]) || 5,
      is_active: cells[statusI]?.toLowerCase() !== "inactive",
      summer_rate_multiplier: parseFloat(cells[summerI]) || 1,
      winter_rate_multiplier: parseFloat(cells[winterI]) || 1,
    });
  }
  return rows;
}

export default function ImportVisaPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseVisaCsv>>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created: string[]; updated: string[]; errors: string[] } | null>(
    null
  );

  if (!user || !isConfigAdminRole(user.role)) {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  function handlePreview() {
    try {
      const rows = parseVisaCsv(csvText);
      if (rows.length === 0) {
        setError("No valid rows found. Include header: Code,Name,Adult/Child SAR,Infant SAR");
        return;
      }
      setPreview(rows);
      setError("");
      setResult(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/visa/categories/import", {
        method: "POST",
        body: JSON.stringify({ visas: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({
        created: data.created || [],
        updated: data.updated || [],
        errors: data.errors || [],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/visa" className="text-primary-600 text-sm hover:underline">
          ← Visa
        </Link>
        <h1 className="text-2xl font-bold">Import Visa Categories</h1>
      </div>

      <div className="card max-w-3xl space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

        <p className="text-sm text-gray-600">
          Paste CSV with columns:{" "}
          <code className="bg-gray-100 px-1 rounded">
            Code,Name,Adult/Child SAR,Infant SAR,Processing Days,Validity Days,Documents,Special
            Conditions,Commission %,Status,Summer Multiplier,Winter Multiplier
          </code>
        </p>

        <textarea
          className="input font-mono text-sm"
          rows={10}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`Code,Name,Adult/Child SAR,Infant SAR\nVISA_BRN_28,Visa With BRN (28 Days),480,490`}
        />

        <div className="flex gap-3">
          <button type="button" className="btn-secondary" onClick={handlePreview}>
            Preview
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={importing || preview.length === 0}
            onClick={handleImport}
          >
            {importing ? "Importing..." : `Import ${preview.length} rows`}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.push("/admin/visa")}>
            Done
          </button>
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Code</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Adult</th>
                  <th className="py-2">Infant</th>
                  <th className="py-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((r) => (
                  <tr key={r.code} className="border-b">
                    <td className="py-2 font-mono text-xs">{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.adult_child_rate_sar}</td>
                    <td>{r.infant_rate_sar}</td>
                    <td>{r.commission_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="text-xs text-gray-500 mt-2">Showing 10 of {preview.length} rows</p>
            )}
          </div>
        )}

        {result && (
          <div className="text-sm space-y-1">
            <p className="text-green-700">Created: {result.created.length}</p>
            <p className="text-blue-700">Updated: {result.updated.length}</p>
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
