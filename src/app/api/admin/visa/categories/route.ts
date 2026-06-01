import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  listVisaCategories,
  logVisaRateHistory,
  mapVisaRow,
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

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_VISA);
  if (permErr) return permErr;

  try {
    const categories = await listVisaCategories();
    return ok({ data: categories });
  } catch (error) {
    return serverError("Failed to load visa categories", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_VISA);
  if (permErr) return permErr;

  try {
    const body = (await request.json()) as VisaUpsertInput;
    const {
      code,
      name,
      adult_child_rate_sar,
      infant_rate_sar = 490,
      processing_time_days = 3,
      validity_days = 28,
      documents_required = ["Passport", "Photo"],
      special_conditions = "",
      commission_percent = 5,
      is_active = true,
      summer_rate_multiplier = 1,
      winter_rate_multiplier = 1,
    } = body;

    if (!code || !name || adult_child_rate_sar == null) {
      return badRequest("code, name, and adult_child_rate_sar are required");
    }

    const result = await query<VisaCategoryRow>(
      `INSERT INTO visa_categories (
        code, name, adult_child_rate_sar, infant_rate_sar,
        processing_time_days, validity_days, documents_required,
        special_conditions, commission_percent, is_active,
        summer_rate_multiplier, winter_rate_multiplier, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id, code, name, adult_child_rate_sar, infant_rate_sar,
                processing_time_days, validity_days, documents_required,
                special_conditions, commission_percent, is_active,
                summer_rate_multiplier, winter_rate_multiplier,
                updated_by, created_at, updated_at`,
      [
        normalizeVisaCode(code),
        name,
        adult_child_rate_sar,
        infant_rate_sar,
        processing_time_days,
        validity_days,
        documents_required,
        special_conditions || null,
        commission_percent,
        is_active,
        summer_rate_multiplier,
        winter_rate_multiplier,
        auth.user.user_id,
      ]
    );

    const category = mapVisaRow(result.rows[0]);
    await logAudit(auth.user.user_id, "CREATE", "visa_category", category.id, {
      code: category.code,
      name: category.name,
    });

    return ok({ category }, 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("unique")) {
      return badRequest("Visa code already exists");
    }
    return serverError("Failed to create visa category", error);
  }
}
