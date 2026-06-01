import { NextRequest } from "next/server";
import { createVendor, listVendors } from "@/lib/services/vendor-service";
import { requireAuth, isAuthContext, requireRole, ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const type = request.nextUrl.searchParams.get("type") || undefined;
  const search = request.nextUrl.searchParams.get("search") || undefined;
  const activeOnly = request.nextUrl.searchParams.get("active") === "1";

  try {
    const data = await listVendors(auth.user.organization_id, { type, search, activeOnly });
    return ok({ data });
  } catch (error) {
    return serverError("Failed to load vendors", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    if (!body.name || !body.type) return badRequest("name and type are required");

    const id = await createVendor(auth.user.organization_id, auth.user.user_id, {
      ...body,
      initial_rate: body.rate_amount ?? body.initial_rate,
    });
    return ok({ id }, 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("unique")) {
      return badRequest("A vendor with this name already exists");
    }
    return serverError("Failed to create vendor", error);
  }
}
