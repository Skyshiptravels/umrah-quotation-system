import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  getVisaCategoryById,
  logVisaRateHistory,
  mapVisaRow,
  VisaCategoryRow,
  VisaUpsertInput,
} from "@/lib/services/visa-admin-service";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  badRequest,
  notFound,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_VISA);
  if (permErr) return permErr;

  const category = await getVisaCategoryById(params.id);
  if (!category) return notFound("Visa category not found");
  return ok({ category });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_VISA);
  if (permErr) return permErr;

  try {
    const body = (await request.json()) as Partial<VisaUpsertInput>;

    const oldResult = await query<VisaCategoryRow>(
      `SELECT id, code, name, adult_child_rate_sar, infant_rate_sar,
              processing_time_days, validity_days, documents_required,
              special_conditions, commission_percent, is_active,
              summer_rate_multiplier, winter_rate_multiplier,
              updated_by, created_at, updated_at
       FROM visa_categories WHERE id = $1`,
      [params.id]
    );
    if (!oldResult.rows[0]) return notFound("Visa category not found");

    const old = mapVisaRow(oldResult.rows[0]);

    const result = await query<VisaCategoryRow>(
      `UPDATE visa_categories SET
        name = COALESCE($1, name),
        adult_child_rate_sar = COALESCE($2, adult_child_rate_sar),
        infant_rate_sar = COALESCE($3, infant_rate_sar),
        processing_time_days = COALESCE($4, processing_time_days),
        validity_days = COALESCE($5, validity_days),
        documents_required = COALESCE($6, documents_required),
        special_conditions = COALESCE($7, special_conditions),
        commission_percent = COALESCE($8, commission_percent),
        is_active = COALESCE($9, is_active),
        summer_rate_multiplier = COALESCE($10, summer_rate_multiplier),
        winter_rate_multiplier = COALESCE($11, winter_rate_multiplier),
        updated_at = NOW(),
        updated_by = $12
       WHERE id = $13
       RETURNING id, code, name, adult_child_rate_sar, infant_rate_sar,
                 processing_time_days, validity_days, documents_required,
                 special_conditions, commission_percent, is_active,
                 summer_rate_multiplier, winter_rate_multiplier,
                 updated_by, created_at, updated_at`,
      [
        body.name,
        body.adult_child_rate_sar,
        body.infant_rate_sar,
        body.processing_time_days,
        body.validity_days,
        body.documents_required,
        body.special_conditions,
        body.commission_percent,
        body.is_active,
        body.summer_rate_multiplier,
        body.winter_rate_multiplier,
        auth.user.user_id,
        params.id,
      ]
    );

    const category = mapVisaRow(result.rows[0]);
    await logVisaRateHistory(
      params.id,
      auth.user.user_id,
      old as unknown as Record<string, unknown>,
      body as Record<string, unknown>
    );
    await logAudit(auth.user.user_id, "UPDATE", "visa_category", params.id, body);

    return ok({ category });
  } catch (error) {
    return serverError("Failed to update visa category", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_VISA);
  if (permErr) return permErr;

  const inUse = await query(
    `SELECT 1 FROM quotation_visas WHERE visa_category_id = $1 LIMIT 1`,
    [params.id]
  );
  if (inUse.rows[0]) {
    return badRequest("Cannot delete visa category used in quotations");
  }

  const result = await query(`DELETE FROM visa_categories WHERE id = $1 RETURNING id`, [
    params.id,
  ]);
  if (!result.rows[0]) return notFound("Visa category not found");

  await logAudit(auth.user.user_id, "DELETE", "visa_category", params.id, {});
  return ok({ deleted: true });
}
