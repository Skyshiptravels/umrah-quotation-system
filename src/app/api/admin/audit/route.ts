import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.VIEW_AUDIT);
  if (permErr) return permErr;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));

  const result = await query(
    `SELECT al.*, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return ok({ data: result.rows });
}
