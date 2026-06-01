export interface UserExportRow {
  email: string;
  full_name: string;
  role: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export function usersToCsv(users: UserExportRow[]): string {
  const headers = [
    "Email",
    "Name",
    "Role",
    "Commission %",
    "Status",
    "Created",
    "Last Login",
  ];
  const rows = users.map((u) => [
    u.email,
    u.full_name,
    u.role,
    String(u.commission_rate),
    u.is_active ? "Active" : "Inactive",
    new Date(u.created_at).toLocaleDateString(),
    u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never",
  ]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadUsersCsv(users: UserExportRow[], filename = "users-export.csv") {
  const csv = usersToCsv(users);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
