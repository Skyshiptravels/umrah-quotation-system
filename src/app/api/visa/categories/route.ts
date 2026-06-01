import { NextRequest } from "next/server";
import { query, toNumber } from "@/lib/db";
import { requireAuth, isAuthContext, ok } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const result = await query(
    `SELECT id as category_id, code, name, adult_child_rate_sar, infant_rate_sar,
            processing_time_days, validity_days, documents_required, special_conditions
     FROM visa_categories
     WHERE is_active = true
     ORDER BY name`
  );

  return ok({
    data: result.rows.map((r) => ({
      category_id: r.category_id,
      code: r.code,
      name: r.name,
      adult_child_rate_sar: toNumber(r.adult_child_rate_sar),
      infant_rate_sar: toNumber(r.infant_rate_sar),
    })),
  });
}
