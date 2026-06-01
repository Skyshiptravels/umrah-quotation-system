"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const allLinks = [
  {
    href: "/admin/hotels",
    label: "Hotel Management",
    desc: "CRUD hotels, rooms, seasons",
    roles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/admin/transport",
    label: "Transport Rates",
    desc: "Routes, vehicles, and pricing",
    roles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/admin/visa",
    label: "Visa Categories",
    desc: "Visa types and SAR rates",
    roles: ["SUPER_ADMIN", "MANAGER"],
  },
  {
    href: "/admin/commissions",
    label: "Staff Commissions",
    desc: "View all staff earnings",
    roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"],
  },
  {
    href: "/admin/vendors",
    label: "Vendor Management",
    desc: "Suppliers, rates, and balances",
    roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"],
  },
  {
    href: "/admin/clients",
    label: "Client Management",
    desc: "Customers, history, and CRM",
    roles: ["SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER"],
  },
  {
    href: "/admin/payments",
    label: "Payment Tracking",
    desc: "Invoices, overdue, reconciliation",
    roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"],
  },
  {
    href: "/admin/financial",
    label: "Financial Reports",
    desc: "Revenue, profit, and margins",
    roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"],
  },
  {
    href: "/admin/invoices",
    label: "Invoice Management",
    desc: "Auto-generated invoices from approvals",
    roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"],
  },
  {
    href: "/admin/hr",
    label: "HR & Payroll",
    desc: "Staff salaries and commission payroll",
    roles: ["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"],
  },
  {
    href: "/admin/users",
    label: "User Management",
    desc: "Create and manage users",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/audit",
    label: "Audit Logs",
    desc: "View system audit trail",
    roles: ["SUPER_ADMIN"],
  },
];

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
    else if (!["SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER"].includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user) return null;

  const links = allLinks.filter((l) => l.roles.includes(user.role));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card hover:shadow-md transition">
            <h2 className="font-semibold text-primary-700">{l.label}</h2>
            <p className="text-sm text-gray-500 mt-2">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
