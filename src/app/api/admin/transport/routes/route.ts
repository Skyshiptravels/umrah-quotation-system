import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
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

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_TRANSPORT);
  if (permErr) return permErr;

  const result = await query(
    `SELECT id, name, start_city, end_city, distance_km, created_at
     FROM transport_routes WHERE deleted_at IS NULL ORDER BY name`
  );
  return ok({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_TRANSPORT);
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const { name, start_city, end_city, distance_km } = body;
    if (!name || !start_city || !end_city) {
      return badRequest("name, start_city, and end_city are required");
    }

    const result = await query(
      `INSERT INTO transport_routes (name, start_city, end_city, distance_km)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, start_city, end_city, distance_km ?? null]
    );

    await logAudit(auth.user.user_id, "CREATE", "transport_route", result.rows[0].id, body);
    return ok({ route: result.rows[0] }, 201);
  } catch (error) {
    console.error("Create route error:", error);
    return serverError("Failed to create route", error);
  }
}
