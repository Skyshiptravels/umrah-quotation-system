import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  normalizeVisaCode,
  VisaCategoryRow,
  VisaUpsertInput,
} from "@/lib/services/visa-admin-service";
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

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_VISA);
  if (permErr) return permErr;

  try {
    const { visas } = await request.json();
    if (!Array.isArray(visas) || visas.length === 0) {
      return badRequest("visas array is required");
    }

    const created: string[] = [];
    const updated: string[] = [];
    const errors: string[] = [];

    for (const row of visas as VisaUpsertInput[]) {
      if (!row.code || !row.name || row.adult_child_rate_sar == null) {
        errors.push(`Skipped row: missing code, name, or adult rate`);
        continue;
      }

      const code = normalizeVisaCode(row.code);

      try {
        const existing = await query(`SELECT id FROM visa_categories WHERE code = $1`, [code]);
        const isNew = !existing.rows[0];

        const result = await query<VisaCategoryRow>(
          `INSERT INTO visa_categories (
            code, name, adult_child_rate_sar, infant_rate_sar,
            processing_time_days, validity_days, documents_required,
            special_conditions, commission_percent, is_active,
            summer_rate_multiplier, winter_rate_multiplier, updated_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            adult_child_rate_sar = EXCLUDED.adult_child_rate_sar,
            infant_rate_sar = EXCLUDED.infant_rate_sar,
            processing_time_days = EXCLUDED.processing_time_days,
            validity_days = EXCLUDED.validity_days,
            documents_required = EXCLUDED.documents_required,
            special_conditions = EXCLUDED.special_conditions,
            commission_percent = EXCLUDED.commission_percent,
            is_active = EXCLUDED.is_active,
            summer_rate_multiplier = EXCLUDED.summer_rate_multiplier,
            winter_rate_multiplier = EXCLUDED.winter_rate_multiplier,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          RETURNING id, code, name, adult_child_rate_sar, infant_rate_sar,
                    processing_time_days, validity_days, documents_required,
                    special_conditions, commission_percent, is_active,
                    summer_rate_multiplier, winter_rate_multiplier,
                    updated_by, created_at, updated_at`,
          [
            code,
            row.name,
            row.adult_child_rate_sar,
            row.infant_rate_sar ?? 490,
            row.processing_time_days ?? 3,
            row.validity_days ?? 28,
            row.documents_required?.length ? row.documents_required : ["Passport", "Photo"],
            row.special_conditions || null,
            row.commission_percent ?? 5,
            row.is_active ?? true,
            row.summer_rate_multiplier ?? 1,
            row.winter_rate_multiplier ?? 1,
            auth.user.user_id,
          ]
        );

        if (isNew) created.push(code);
        else updated.push(code);
      } catch (err) {
        errors.push(`${code}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    await logAudit(auth.user.user_id, "IMPORT", "visa_category", null, {
      created: created.length,
      updated: updated.length,
    });

    return ok({
      count: created.length + updated.length,
      created,
      updated,
      errors,
    });
  } catch (error) {
    return serverError("Import failed", error);
  }
}
