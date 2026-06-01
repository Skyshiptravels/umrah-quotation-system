import { NextRequest } from "next/server";
import { query, toNumber } from "@/lib/db";
import { requireAuth, isAuthContext, ok, notFound } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { route_id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const route = await query(
    `SELECT id FROM transport_routes WHERE id = $1 AND deleted_at IS NULL`,
    [params.route_id]
  );
  if (!route.rows[0]) return notFound("Route not found");

  const result = await query(
    `SELECT tr.vehicle_type, v.capacity_pax, tr.price_sar, tr.is_sharing
     FROM transport_rates tr
     JOIN vehicles v ON v.vehicle_type = tr.vehicle_type
     WHERE tr.route_id = $1
     ORDER BY v.capacity_pax`,
    [params.route_id]
  );

  return ok({
    route_id: params.route_id,
    options: result.rows.map((r) => ({
      vehicle_type: r.vehicle_type,
      capacity: r.capacity_pax,
      price_sar: toNumber(r.price_sar),
      is_sharing: r.is_sharing,
    })),
  });
}
