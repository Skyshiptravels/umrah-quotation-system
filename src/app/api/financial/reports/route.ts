import { NextRequest } from "next/server";
import { getFinancialReports } from "@/lib/services/financial-service";
import { requireAuth, isAuthContext, requireRole, ok, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);

  try {
    const data = await getFinancialReports(auth.user.organization_id, days);
    return ok(data);
  } catch (error) {
    return serverError("Failed to generate financial reports", error);
  }
}
