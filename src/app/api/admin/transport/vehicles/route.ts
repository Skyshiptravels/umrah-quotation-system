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
    `SELECT id, vehicle_type, capacity_pax FROM vehicles ORDER BY vehicle_type`
  );
  return ok({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_TRANSPORT);
  if (permErr) return permErr;

  try {
    const { vehicle_type, capacity_pax } = await request.json();
    if (!vehicle_type || !capacity_pax) {
      return badRequest("vehicle_type and capacity_pax are required");
    }

    const result = await query(
      `INSERT INTO vehicles (vehicle_type, capacity_pax) VALUES ($1, $2)
       ON CONFLICT (vehicle_type) DO UPDATE SET capacity_pax = $2
       RETURNING *`,
      [vehicle_type, capacity_pax]
    );

    await logAudit(auth.user.user_id, "CREATE", "vehicle", result.rows[0].id, {
      vehicle_type,
      capacity_pax,
    });
    return ok({ vehicle: result.rows[0] }, 201);
  } catch (error) {
    return serverError("Failed to save vehicle", error);
  }
}
