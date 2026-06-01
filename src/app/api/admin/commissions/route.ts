import { NextRequest } from "next/server";
import { getAdminCommissionsSummary } from "@/lib/services/commission-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  serverError,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const roleErr = requireRole(auth, "MANAGER", "SUPER_ADMIN", "ACCOUNTS_MANAGER");
  if (roleErr) return roleErr;

  try {
    const staffList = await getAdminCommissionsSummary();
    return ok({ data: staffList });
  } catch (error) {
    console.error("Admin commissions error:", error);
    return serverError("Failed to load commissions");
  }
}
