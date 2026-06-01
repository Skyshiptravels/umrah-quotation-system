import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  notFound,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_TRANSPORT);
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const { price_sar, is_sharing } = body;

    const result = await query(
      `UPDATE transport_rates SET
        price_sar = COALESCE($1, price_sar),
        is_sharing = COALESCE($2, is_sharing),
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [price_sar, is_sharing, params.id]
    );

    if (!result.rows[0]) return notFound("Rate not found");
    await logAudit(auth.user.user_id, "UPDATE", "transport_rate", params.id, body);
    return ok({ rate: result.rows[0] });
  } catch (error) {
    return serverError("Failed to update rate", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_TRANSPORT);
  if (permErr) return permErr;

  const result = await query(`DELETE FROM transport_rates WHERE id = $1 RETURNING id`, [
    params.id,
  ]);
  if (!result.rows[0]) return notFound("Rate not found");

  await logAudit(auth.user.user_id, "DELETE", "transport_rate", params.id, {});
  return ok({ deleted: true });
}
