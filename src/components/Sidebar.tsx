"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", roles: ["STAFF", "AGENT", "MANAGER", "SUPER_ADMIN", "ACCOUNTS_MANAGER", "VIEWER"] },
  { href: "/quotations/new", label: "New Quotation", roles: ["STAFF", "AGENT", "SUPER_ADMIN"] },
  { href: "/quotations", label: "Quotations", roles: ["STAFF", "AGENT", "MANAGER", "SUPER_ADMIN", "ACCOUNTS_MANAGER", "VIEWER"] },
  { href: "/commissions", label: "Commissions", roles: ["STAFF", "AGENT", "MANAGER", "SUPER_ADMIN", "ACCOUNTS_MANAGER"] },
  { href: "/admin", label: "Admin", roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"] },
  { href: "/admin/hotels", label: "Hotels", roles: ["SUPER_ADMIN", "MANAGER"] },
  { href: "/admin/transport", label: "Transport", roles: ["SUPER_ADMIN", "MANAGER"] },
  { href: "/admin/visa", label: "Visa Rates", roles: ["SUPER_ADMIN", "MANAGER"] },
  { href: "/admin/users", label: "Users", roles: ["SUPER_ADMIN"] },
  { href: "/admin/audit", label: "Audit Logs", roles: ["SUPER_ADMIN"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const filtered = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-primary-800 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-700">
        <h1 className="text-lg font-bold">Umrah Quotation</h1>
        <p className="text-primary-200 text-sm mt-1">System V2</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {filtered.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg text-sm transition ${
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary-600 text-white"
                : "text-primary-100 hover:bg-primary-700"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-primary-700">
        <p className="text-sm text-primary-200 truncate">{user.email}</p>
        <p className="text-xs text-primary-300">{user.role}</p>
        <button
          onClick={() => logout().then(() => (window.location.href = "/login"))}
          className="mt-3 text-sm text-primary-200 hover:text-white"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
