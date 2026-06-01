import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  getUserById,
  logDeactivationHistory,
  logUserAudit,
  mapUserRow,
  UserAdminRow,
  validateRole,
} from "@/lib/services/user-admin-service";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  notFound,
  badRequest,
  forbidden,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  const user = await getUserById(params.id, auth.user.organization_id);
  if (!user) return notFound("User not found");
  return ok({ user });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const { full_name, role, commission_rate, staff_margin_percent, is_active } = body;

    if (role && !validateRole(role)) {
      return badRequest("Invalid role");
    }

    if (params.id === auth.user.user_id && role && role !== auth.user.role) {
      return badRequest("You cannot change your own role");
    }

    const margin = commission_rate ?? staff_margin_percent;

    const result = await query<UserAdminRow>(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        role = COALESCE($2, role),
        staff_margin_percent = COALESCE($3, staff_margin_percent),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5 AND organization_id = $6 AND deleted_at IS NULL
       RETURNING id, email, full_name, role, is_active, staff_margin_percent,
                 organization_id, last_login_at, must_change_password, created_at`,
      [full_name, role, margin, is_active, params.id, auth.user.organization_id]
    );

    if (!result.rows[0]) return notFound("User not found");

    const user = mapUserRow(result.rows[0]);
    await logAudit(auth.user.user_id, "UPDATE", "user", params.id, body);
    await logUserAudit(params.id, "UPDATE", auth.user.user_id, body);

    return ok({ user });
  } catch (error) {
    return serverError("Failed to update user", error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  if (params.id === auth.user.user_id) {
    return badRequest("You cannot deactivate your own account");
  }

  try {
    const { is_active, reason } = await request.json();

    const result = await query<UserAdminRow>(
      `UPDATE users SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING id, email, full_name, role, is_active, staff_margin_percent,
                 organization_id, last_login_at, must_change_password, created_at`,
      [is_active, params.id, auth.user.organization_id]
    );

    if (!result.rows[0]) return notFound("User not found");

    const action = is_active ? "REACTIVATE" : "DEACTIVATE";
    await logDeactivationHistory(params.id, action, auth.user.user_id, reason);
    await logUserAudit(params.id, action, auth.user.user_id, { is_active, reason });

    return ok({ user: mapUserRow(result.rows[0]) });
  } catch (error) {
    return serverError("Failed to update status", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  if (params.id === auth.user.user_id) {
    return forbidden("You cannot delete your own account");
  }

  try {
    const result = await query<UserAdminRow>(
      `UPDATE users SET deleted_at = NOW(), is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [params.id, auth.user.organization_id]
    );

    if (!result.rows[0]) return notFound("User not found");

    await logUserAudit(params.id, "DELETE", auth.user.user_id, {});
    await logAudit(auth.user.user_id, "DELETE", "user", params.id, {});

    return ok({ deleted: true });
  } catch (error) {
    return serverError("Failed to delete user", error);
  }
}
