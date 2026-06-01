"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface QuotationListItem {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_cost_sar: string;
  total_cost_pkr: string;
  created_at: string;
  expiry_date?: string;
  adults: string;
  children_with_bed: string;
  children_without_bed: string;
  infants: string;
}

export default function QuotationsPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  const fetchQuotations = useCallback(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (searchName) params.set("search", searchName);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);
    if (sortBy) params.set("sort", sortBy);

    setLoading(true);
    return apiFetch(`/api/quotations?${params}`)
      .then((r) => r.json())
      .then((d) => setQuotations(d.data || []))
      .finally(() => setLoading(false));
  }, [apiFetch, searchName, filterStatus, filterDateFrom, filterDateTo, sortBy]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    void fetchQuotations();
  }, [user, router, fetchQuotations]);

  const drafts = useMemo(
    () => quotations.filter((q) => q.status === "DRAFT"),
    [quotations]
  );
  const submitted = useMemo(
    () => quotations.filter((q) => q.status !== "DRAFT"),
    [quotations]
  );

  async function deleteDraft(id: string) {
    if (!confirm("Delete this draft quotation?")) return;
    const res = await apiFetch(`/api/quotations/${id}`, { method: "DELETE" });
    if (res.ok) void fetchQuotations();
  }

  function totalPassengers(q: QuotationListItem) {
    return (
      Number(q.adults || 0) +
      Number(q.children_with_bed || 0) +
      Number(q.children_without_bed || 0) +
      Number(q.infants || 0)
    );
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      DRAFT: "bg-yellow-100 text-yellow-800",
      PENDING: "bg-blue-100 text-blue-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  }

  function renderTable(items: QuotationListItem[], showDraftActions: boolean) {
    if (!items.length) return null;
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4">Customer</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Created</th>
            <th className="pb-2 pr-4">Total SAR</th>
            <th className="pb-2 pr-4">Pax</th>
            {showDraftActions && <th className="pb-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr key={q.id} className="border-b">
              <td className="py-3 pr-4">
                <Link href={`/quotations/${q.id}`} className="text-primary-600 hover:underline font-medium">
                  {q.customer_name}
                </Link>
                <p className="text-xs text-gray-400">{q.customer_email}</p>
              </td>
              <td className="pr-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(q.status)}`}>
                  {q.status}
                </span>
              </td>
              <td className="pr-4">{new Date(q.created_at).toLocaleDateString()}</td>
              <td className="pr-4">{parseFloat(q.total_cost_sar || "0").toLocaleString()}</td>
              <td className="pr-4">{totalPassengers(q)}</td>
              {showDraftActions && (
                <td className="py-3 flex gap-2">
                  <Link
                    href={`/quotations/${q.id}/edit`}
                    className="text-xs btn-primary py-1 px-2"
                  >
                    Resume
                  </Link>
                  <button
                    type="button"
                    className="text-xs bg-red-600 text-white py-1 px-2 rounded"
                    onClick={() => deleteDraft(q.id)}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quotations</h1>
        {["STAFF", "AGENT", "SUPER_ADMIN"].includes(user.role) && (
          <Link href="/quotations/new" className="btn-primary">
            New Quotation
          </Link>
        )}
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="input"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="input"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field md:col-span-2 lg:col-span-4"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
        {(searchName || filterStatus !== "all" || filterDateFrom || filterDateTo) && (
          <button
            type="button"
            className="mt-4 text-sm text-primary-600 hover:underline"
            onClick={() => {
              setSearchName("");
              setFilterStatus("all");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
          >
            Clear all filters
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Showing {quotations.length} quotation{quotations.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : quotations.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">No quotations found</div>
      ) : (
        <div className="space-y-8">
          {drafts.length > 0 && (
            <div className="card overflow-x-auto">
              <h2 className="font-semibold mb-4">Draft Quotations</h2>
              {renderTable(drafts, true)}
            </div>
          )}
          <div className="card overflow-x-auto">
            <h2 className="font-semibold mb-4">
              {drafts.length ? "Submitted Quotations" : "All Quotations"}
            </h2>
            {renderTable(submitted.length ? submitted : quotations, false)}
          </div>
        </div>
      )}
    </div>
  );
}
