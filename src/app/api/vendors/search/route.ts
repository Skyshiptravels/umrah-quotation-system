import { NextRequest } from "next/server";
import { searchVendors } from "@/lib/services/quotation-workflow-service";
import { requireAuth, isAuthContext, requireRole, ok, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const search = request.nextUrl.searchParams.get("q") || undefined;
  const type = request.nextUrl.searchParams.get("type") || undefined;

  try {
    const data = await searchVendors(auth.user.organization_id, search, type);
    return ok({ data });
  } catch (error) {
    return serverError("Failed to search vendors", error);
  }
}
