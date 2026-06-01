import { NextRequest } from "next/server";
import { listInvoices } from "@/lib/services/financial-service";
import { requireAuth, isAuthContext, requireRole, ok, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  try {
    const data = await listInvoices(auth.user.organization_id);
    return ok({ data });
  } catch (error) {
    return serverError("Failed to list invoices", error);
  }
}
