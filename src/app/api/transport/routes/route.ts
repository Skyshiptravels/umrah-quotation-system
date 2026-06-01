import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth, isAuthContext, ok } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const result = await query(
    `SELECT id as route_id, name, start_city, end_city, distance_km
     FROM transport_routes WHERE deleted_at IS NULL ORDER BY name`
  );

  return ok({ data: result.rows });
}
