import { NextRequest } from "next/server";
import { getPayrollForMonth, listStaffHr, processMonthlyPayroll } from "@/lib/services/payroll-service";
import { requireAuth, isAuthContext, requireRole, ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const monthYear = request.nextUrl.searchParams.get("month");
  if (monthYear) {
    const payrollPerm = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
    if (payrollPerm) return payrollPerm;
  } else {
    const listPerm = requireRole(
      auth,
      "SUPER_ADMIN",
      "MANAGER",
      "ACCOUNTS_MANAGER",
      "STAFF",
      "AGENT"
    );
    if (listPerm) return listPerm;
  }

  try {
    if (monthYear) {
      const payroll = await getPayrollForMonth(auth.user.organization_id, monthYear);
      return ok({ payroll });
    }
    const staff = await listStaffHr(auth.user.organization_id);
    return ok({ staff });
  } catch (error) {
    return serverError("Failed to load HR data", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER");
  if (permErr) return permErr;

  const { month_year } = await request.json();
  if (!month_year) return badRequest("month_year is required (e.g. May-2026)");

  try {
    const result = await processMonthlyPayroll(auth.user.organization_id, month_year);
    return ok(result);
  } catch (error) {
    return serverError("Failed to process payroll", error);
  }
}
