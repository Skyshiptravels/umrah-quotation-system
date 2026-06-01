import { NextRequest } from "next/server";
import { createClient, getAtRiskClients, listClients } from "@/lib/services/client-service";
import { requireAuth, isAuthContext, requireRole, ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const search = request.nextUrl.searchParams.get("search") || undefined;
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const atRisk = request.nextUrl.searchParams.get("at_risk");

  try {
    if (atRisk === "1") {
      const data = await getAtRiskClients(auth.user.organization_id);
      return ok({ data });
    }
    const data = await listClients(auth.user.organization_id, { search, status });
    return ok({ data });
  } catch (error) {
    return serverError("Failed to load clients", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    if (!body.email || !body.phone || !body.full_name) {
      return badRequest("email, phone, and full_name are required");
    }
    const id = await createClient(auth.user.organization_id, auth.user.user_id, body);
    return ok({ id }, 201);
  } catch (error) {
    return serverError("Failed to create client", error);
  }
}
