import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { addVendorAvailability, getVendorAvailability } from "@/lib/services/vendor-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

async function vendorExists(vendorId: string, orgId: string) {
  const r = await query(
    `SELECT id FROM vendors WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [vendorId, orgId]
  );
  return Boolean(r.rows[0]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  if (!(await vendorExists(params.id, auth.user.organization_id))) {
    return notFound("Vendor not found");
  }

  const data = await getVendorAvailability(params.id);
  return ok({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER");
  if (permErr) return permErr;

  if (!(await vendorExists(params.id, auth.user.organization_id))) {
    return notFound("Vendor not found");
  }

  try {
    const body = await request.json();
    if (!body.available_from || !body.available_to) {
      return badRequest("available_from and available_to are required");
    }
    const slot = await addVendorAvailability(params.id, body);
    return ok({ slot }, 201);
  } catch (error) {
    return serverError("Failed to add availability", error);
  }
}
