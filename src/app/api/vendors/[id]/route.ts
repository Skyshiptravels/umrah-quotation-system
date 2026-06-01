import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getVendorById, normalizePaymentTerms, normalizeVendorType } from "@/lib/services/vendor-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  serverError,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const data = await getVendorById(params.id, auth.user.organization_id);
  if (!data) return notFound("Vendor not found");
  return ok(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const result = await query(
      `UPDATE vendors SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        contact_email = COALESCE($3, contact_email),
        contact_phone = COALESCE($4, contact_phone),
        payment_terms = COALESCE($5, payment_terms),
        commission_rate = COALESCE($6, commission_rate),
        is_active = COALESCE($7, is_active),
        notes = COALESCE($8, notes),
        updated_by = $9,
        updated_at = NOW()
       WHERE id = $10 AND organization_id = $11 AND deleted_at IS NULL
       RETURNING id`,
      [
        body.name,
        body.type ? normalizeVendorType(body.type) : null,
        body.contact_email,
        body.contact_phone,
        body.payment_terms ? normalizePaymentTerms(body.payment_terms) : null,
        body.commission_rate,
        body.is_active,
        body.notes,
        auth.user.user_id,
        params.id,
        auth.user.organization_id,
      ]
    );
    if (!result.rows[0]) return notFound("Vendor not found");
    const updated = await getVendorById(params.id, auth.user.organization_id);
    return ok(updated);
  } catch (error) {
    return serverError("Failed to update vendor", error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER");
  if (permErr) return permErr;

  try {
    const { is_active } = await request.json();
    await query(
      `UPDATE vendors SET is_active = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL`,
      [is_active, auth.user.user_id, params.id, auth.user.organization_id]
    );
    return ok({ deactivated: is_active === false });
  } catch (error) {
    return serverError("Failed to update vendor status", error);
  }
}
