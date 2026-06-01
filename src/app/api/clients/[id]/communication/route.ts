import { NextRequest } from "next/server";
import {
  getClientById,
  getClientCommunications,
  logClientCommunication,
} from "@/lib/services/client-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

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
    const data = await getClientCommunications(params.id);
    return ok({ data });
  } catch (error) {
    return serverError("Failed to load communication log", error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    if (!body.communication_type) {
      return badRequest("communication_type is required");
    }
    const entry = await logClientCommunication(
      params.id,
      auth.user.organization_id,
      auth.user.user_id,
      body
    );
    if (!entry) return notFound("Client not found");
    return ok({ communication: entry }, 201);
  } catch (error) {
    return serverError("Failed to log communication", error);
  }
}
