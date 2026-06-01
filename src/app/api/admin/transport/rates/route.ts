import { NextRequest } from "next/server";
import { query, toNumber } from "@/lib/db";
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
    `SELECT tr.id, tr.route_id, tr.vehicle_type, tr.price_sar, tr.is_sharing,
            r.name as route_name, r.start_city, r.end_city,
            v.capacity_pax
     FROM transport_rates tr
     JOIN transport_routes r ON r.id = tr.route_id AND r.deleted_at IS NULL
     LEFT JOIN vehicles v ON v.vehicle_type = tr.vehicle_type
     ORDER BY r.name, tr.vehicle_type`
  );

  return ok({
    data: result.rows.map((row) => ({
      ...row,
      price_sar: toNumber(row.price_sar),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_TRANSPORT);
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const { route_id, vehicle_type, price_sar, is_sharing = false } = body;

    if (!route_id || !vehicle_type || price_sar == null) {
      return badRequest("route_id, vehicle_type, and price_sar are required");
    }

    await query(
      `INSERT INTO vehicles (vehicle_type, capacity_pax) VALUES ($1, $2)
       ON CONFLICT (vehicle_type) DO NOTHING`,
      [vehicle_type, body.capacity_pax ?? 1]
    );

    const result = await query(
      `INSERT INTO transport_rates (route_id, vehicle_type, price_sar, is_sharing)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (route_id, vehicle_type)
       DO UPDATE SET price_sar = $3, is_sharing = $4, updated_at = NOW()
       RETURNING *`,
      [route_id, vehicle_type, price_sar, is_sharing]
    );

    await logAudit(auth.user.user_id, "CREATE", "transport_rate", result.rows[0].id, body);
    return ok({ rate: result.rows[0] }, 201);
  } catch (error) {
    console.error("Create rate error:", error);
    return serverError("Failed to save rate", error);
  }
}
