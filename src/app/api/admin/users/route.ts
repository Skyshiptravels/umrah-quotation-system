import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  listUsers,
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
  badRequest,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  try {
    const users = await listUsers(auth.user.organization_id);
    return ok({ data: users });
  } catch (error) {
    return serverError("Failed to load users", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const {
      email,
      password,
      full_name,
      role,
      commission_rate,
      staff_margin_percent,
      is_active = true,
    } = body;

    if (!email || !role) {
      return badRequest("email and role are required");
    }

    if (!validateRole(role)) {
      return badRequest("Invalid role");
    }

    const margin = commission_rate ?? staff_margin_percent ?? 10;
    const pwd = password || "TempPass@123";
    const passwordHash = await hashPassword(pwd);

    const exists = await query(
      `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );
    if (exists.rows[0]) {
      return badRequest("Email already exists");
    }

    const result = await query<UserAdminRow>(
      `INSERT INTO users (
        email, password_hash, organization_id, role, staff_margin_percent,
        full_name, is_active, must_change_password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, email, full_name, role, is_active, staff_margin_percent,
                organization_id, last_login_at, must_change_password, created_at`,
      [
        email.toLowerCase(),
        passwordHash,
        auth.user.organization_id,
        role,
        margin,
        full_name || email.split("@")[0],
        is_active,
      ]
    );

    const user = mapUserRow(result.rows[0]);
    await logAudit(auth.user.user_id, "CREATE", "user", user.id, { email, role });
    await logUserAudit(user.id, "CREATE", auth.user.user_id, { email, role, margin });

    return ok({ user, temporary_password: pwd }, 201);
  } catch (error) {
    console.error("Create user error:", error);
    return serverError("Failed to create user", error);
  }
}
