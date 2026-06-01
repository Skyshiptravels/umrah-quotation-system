import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  badRequest,
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
    const { name, start_city, end_city, distance_km } = body;

    const result = await query(
      `UPDATE transport_routes SET
        name = COALESCE($1, name),
        start_city = COALESCE($2, start_city),
        end_city = COALESCE($3, end_city),
        distance_km = COALESCE($4, distance_km),
        updated_at = NOW()
       WHERE id = $5 AND deleted_at IS NULL RETURNING *`,
      [name, start_city, end_city, distance_km, params.id]
    );

    if (!result.rows[0]) return notFound("Route not found");
    await logAudit(auth.user.user_id, "UPDATE", "transport_route", params.id, body);
    return ok({ route: result.rows[0] });
  } catch (error) {
    return serverError("Failed to update route", error);
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

  try {
    const inUse = await query(
      `SELECT 1 FROM quotation_transport WHERE route_id = $1 LIMIT 1`,
      [params.id]
    );
    if (inUse.rows[0]) {
      return badRequest("Cannot delete route used in quotations");
    }

    await query(`DELETE FROM transport_rates WHERE route_id = $1`, [params.id]);
    const result = await query(
      `UPDATE transport_routes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [params.id]
    );
    if (!result.rows[0]) return notFound("Route not found");

    await logAudit(auth.user.user_id, "DELETE", "transport_route", params.id, {});
    return ok({ deleted: true });
  } catch (error) {
    return serverError("Failed to delete route", error);
  }
}
