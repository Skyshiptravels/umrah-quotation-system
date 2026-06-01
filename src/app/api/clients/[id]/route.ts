import { NextRequest } from "next/server";
import { getClientById, updateClient } from "@/lib/services/client-service";
import { requireAuth, isAuthContext, requireRole, ok, notFound, serverError } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const data = await getClientById(params.id, auth.user.organization_id);
  if (!data) return notFound("Client not found");
  return ok(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const id = await updateClient(params.id, auth.user.organization_id, body);
    if (!id) return notFound("Client not found");
    return ok({ updated: true, id });
  } catch (error) {
    return serverError("Failed to update client", error);
  }
}
