import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { logUserAudit, validateRole } from "@/lib/services/user-admin-service";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  badRequest,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  try {
    const { users } = await request.json();
    if (!Array.isArray(users) || users.length === 0) {
      return badRequest("users array is required");
    }

    const created: string[] = [];
    const errors: string[] = [];

    for (const row of users) {
      const { email, full_name, role, commission_rate, password } = row;
      if (!email || !role) {
        errors.push(`Skipped row: missing email or role`);
        continue;
      }
      if (!validateRole(role)) {
        errors.push(`Invalid role for ${email}`);
        continue;
      }

      const exists = await query(
        `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [email.toLowerCase()]
      );
      if (exists.rows[0]) {
        errors.push(`Email already exists: ${email}`);
        continue;
      }

      const pwd = password || "TempPass@123";
      const hash = await hashPassword(pwd);

      const result = await query(
        `INSERT INTO users (
          email, password_hash, organization_id, role, staff_margin_percent,
          full_name, is_active, must_change_password
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true) RETURNING id`,
        [
          email.toLowerCase(),
          hash,
          auth.user.organization_id,
          role,
          commission_rate ?? 10,
          full_name || email.split("@")[0],
        ]
      );

      await logUserAudit(result.rows[0].id, "CREATE", auth.user.user_id, {
        email,
        role,
        import: true,
      });
      created.push(email);
    }

    return ok({ created, errors, count: created.length });
  } catch (error) {
    return serverError("Import failed", error);
  }
}
