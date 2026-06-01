import { NextRequest } from "next/server";
import { getClientById, getClientQuotations } from "@/lib/services/client-service";
import { requireAuth, isAuthContext, requireRole, ok, notFound, serverError } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  try {
    const client = await getClientById(params.id, auth.user.organization_id);
    if (!client) return notFound("Client not found");
    const data = await getClientQuotations(params.id);
    return ok({ data });
  } catch (error) {
    return serverError("Failed to load client quotations", error);
  }
}
