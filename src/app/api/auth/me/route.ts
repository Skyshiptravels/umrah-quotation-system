import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const result = await query(
    `SELECT id, email, organization_id, role, staff_margin_percent, is_active, created_at
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [auth.user.user_id]
  );

  const user = result.rows[0];
  if (!user) return notFound("User not found");

  return ok({ user });
}
