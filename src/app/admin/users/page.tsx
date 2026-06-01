"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { downloadUsersCsv } from "@/lib/export-users";
import { generatePayslipPdf } from "@/lib/generate-payslip";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  commission_rate: number;
  created_at: string;
  last_login_at: string | null;
}

interface ActivityEntry {
  id: string;
  action: string;
  changes_json?: Record<string, unknown>;
  created_at: string;
  changed_by_email?: string;
  reason?: string;
}

const ROLES = [
  "SUPER_ADMIN",
  "MANAGER",
  "STAFF",
  "AGENT",
  "ACCOUNTS_MANAGER",
  "VIEWER",
] as const;

export default function AdminUsersPage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityUser, setActivityUser] = useState<UserRow | null>(null);
  const [activity, setActivity] = useState<{
    audit: ActivityEntry[];
    deactivation: ActivityEntry[];
  } | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  const loadUsers = useCallback(async () => {
    const res = await apiFetch("/api/admin/users");
    const data = await res.json();
    if (res.ok) setUsers(data.data || []);
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }
    loadUsers();
  }, [user, router, loadUsers]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.full_name.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (statusFilter === "active") {
      result = result.filter((u) => u.is_active);
    } else if (statusFilter === "inactive") {
      result = result.filter((u) => !u.is_active);
    }
    return result;
  }, [users, searchTerm, roleFilter, statusFilter]);

  async function toggleActive(u: UserRow) {
    const next = !u.is_active;
    const label = next ? "reactivate" : "deactivate";
    if (!window.confirm(`${next ? "Activate" : "Deactivate"} ${u.email}?`)) return;

    const res = await apiFetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to update status");
      return;
    }
    setActionMsg(`User ${label}d successfully`);
    loadUsers();
  }

  async function resetPassword(u: UserRow) {
    if (!window.confirm(`Send password reset link to ${u.email}?`)) return;
    const res = await apiFetch(`/api/admin/users/${u.id}/reset-password`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Reset failed");
      return;
    }
    const msg = data.resetLink
      ? `Reset link (dev): ${data.resetLink}`
      : data.message || "Reset link sent";
    setActionMsg(msg);
  }

  async function showActivity(u: UserRow) {
    const res = await apiFetch(`/api/admin/users/${u.id}/activity`);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to load activity");
      return;
    }
    setActivityUser(u);
    setActivity(data);
  }

  async function downloadPayslip(u: UserRow) {
    const res = await apiFetch("/api/admin/commissions");
    const data = await res.json();
    const staff = (data.data || []).find((s: { id: string }) => s.id === u.id);
    const now = new Date();
    const month = now.toLocaleString("en", { month: "long" });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalSAR = 0;
    let totalCommissionSAR = 0;
    let quotations = 0;

    for (const c of staff?.commissions || []) {
      const created = new Date(c.created_at);
      if (created >= monthStart) {
        quotations += 1;
        totalSAR += parseFloat(c.total_cost_sar || "0");
        totalCommissionSAR += parseFloat(c.commission_amount_sar || "0");
      }
    }

    generatePayslipPdf({
      userName: u.full_name,
      userEmail: u.email,
      month,
      year: now.getFullYear(),
      commissionRate: u.commission_rate,
      quotations,
      totalSAR,
      totalCommissionSAR,
      totalCommissionPKR: totalCommissionSAR * 75,
    });
  }

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-primary-600 text-sm hover:underline">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadUsersCsv(users)}
            className="btn-secondary text-sm"
          >
            Export CSV
          </button>
          <Link href="/admin/users/import" className="btn-secondary text-sm">
            Bulk Import
          </Link>
          <Link href="/admin/users/create" className="btn-primary text-sm">
            + Add User
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded text-sm">{actionMsg}</div>
      )}

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading users...</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Commission %</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-800 rounded text-xs font-medium">
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.commission_rate}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                      <Link
                        href={`/admin/users/${u.id}/edit`}
                        className="text-primary-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className="text-red-600 hover:underline"
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => resetPassword(u)}
                        className="text-gray-600 hover:underline"
                      >
                        Reset PW
                      </button>
                      <button
                        type="button"
                        onClick={() => showActivity(u)}
                        className="text-gray-600 hover:underline"
                      >
                        Activity
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPayslip(u)}
                        className="text-gray-600 hover:underline"
                      >
                        Payslip
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <p className="p-8 text-center text-gray-500">No users found</p>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Inactive</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter((u) => !u.is_active).length}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-gray-500 text-sm">Roles</p>
          <p className="text-2xl font-bold">
            {new Set(users.map((u) => u.role)).size}
          </p>
        </div>
      </div>

      {activityUser && activity && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">Activity Log</h3>
                <p className="text-sm text-gray-500">{activityUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivityUser(null);
                  setActivity(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {activity.audit.map((log) => (
                <div key={log.id} className="border-b pb-2 text-sm">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                    {log.changed_by_email ? ` · by ${log.changed_by_email}` : ""}
                  </p>
                </div>
              ))}
              {activity.deactivation.map((log) => (
                <div key={log.id} className="border-b pb-2 text-sm">
                  <p className="font-medium">{log.action}</p>
                  {log.reason && <p className="text-gray-600">{log.reason}</p>}
                  <p className="text-gray-500 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                    {log.changed_by_email ? ` · by ${log.changed_by_email}` : ""}
                  </p>
                </div>
              ))}
              {activity.audit.length === 0 && activity.deactivation.length === 0 && (
                <p className="text-gray-500 text-sm">No activity recorded yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
