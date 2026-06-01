import { query, toNumber } from "@/lib/db";

export interface VisaCategoryRow {
  id: string;
  code: string;
  name: string;
  adult_child_rate_sar: string;
  infant_rate_sar: string;
  processing_time_days: number;
  validity_days: number;
  documents_required: string[] | null;
  special_conditions: string | null;
  commission_percent: string;
  is_active: boolean;
  summer_rate_multiplier: string;
  winter_rate_multiplier: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface VisaCategoryDto {
  id: string;
  code: string;
  name: string;
  adult_child_rate_sar: number;
  infant_rate_sar: number;
  processing_time_days: number;
  validity_days: number;
  documents_required: string[];
  special_conditions: string;
  commission_percent: number;
  is_active: boolean;
  summer_rate_multiplier: number;
  winter_rate_multiplier: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
}

const VISA_SELECT = `
  id, code, name, adult_child_rate_sar, infant_rate_sar,
  processing_time_days, validity_days, documents_required,
  special_conditions, commission_percent, is_active,
  summer_rate_multiplier, winter_rate_multiplier,
  updated_by, created_at, updated_at
`;

export function mapVisaRow(row: VisaCategoryRow): VisaCategoryDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    adult_child_rate_sar: toNumber(row.adult_child_rate_sar),
    infant_rate_sar: toNumber(row.infant_rate_sar),
    processing_time_days: row.processing_time_days ?? 3,
    validity_days: row.validity_days ?? 28,
    documents_required: row.documents_required?.length
      ? row.documents_required
      : ["Passport", "Photo"],
    special_conditions: row.special_conditions || "",
    commission_percent: toNumber(row.commission_percent) || 5,
    is_active: row.is_active ?? true,
    summer_rate_multiplier: toNumber(row.summer_rate_multiplier) || 1,
    winter_rate_multiplier: toNumber(row.winter_rate_multiplier) || 1,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listVisaCategories(): Promise<VisaCategoryDto[]> {
  const result = await query<VisaCategoryRow>(
    `SELECT ${VISA_SELECT} FROM visa_categories ORDER BY code ASC`
  );
  return result.rows.map(mapVisaRow);
}

export async function getVisaCategoryById(id: string): Promise<VisaCategoryDto | null> {
  const result = await query<VisaCategoryRow>(
    `SELECT ${VISA_SELECT} FROM visa_categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] ? mapVisaRow(result.rows[0]) : null;
}

export async function logVisaRateHistory(
  visaId: string,
  changedBy: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Promise<void> {
  const tracked = [
    "name",
    "adult_child_rate_sar",
    "infant_rate_sar",
    "processing_time_days",
    "validity_days",
    "documents_required",
    "special_conditions",
    "commission_percent",
    "is_active",
    "summer_rate_multiplier",
    "winter_rate_multiplier",
  ];

  for (const field of tracked) {
    if (!(field in newData)) continue;
    const oldVal = oldData[field];
    const newVal = newData[field];
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    await query(
      `INSERT INTO visa_rate_history (visa_id, field_changed, old_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        visaId,
        field,
        oldVal == null ? null : String(oldVal),
        newVal == null ? null : String(newVal),
        changedBy,
      ]
    );
  }
}

export async function logVisaUsage(
  visaId: string,
  quotationId: string,
  season: string
): Promise<void> {
  await query(
    `INSERT INTO visa_usage_stats (visa_id, quotation_id, season) VALUES ($1, $2, $3)`,
    [visaId, quotationId, season]
  );
}

export async function getVisaRateHistory(visaId: string) {
  const result = await query(
    `SELECT vrh.id, vrh.field_changed, vrh.old_value, vrh.new_value,
            vrh.changed_at, u.email as changed_by_email
     FROM visa_rate_history vrh
     LEFT JOIN users u ON u.id = vrh.changed_by
     WHERE vrh.visa_id = $1
     ORDER BY vrh.changed_at DESC
     LIMIT 100`,
    [visaId]
  );
  return result.rows;
}

export interface VisaUpsertInput {
  code?: string;
  name: string;
  adult_child_rate_sar: number;
  infant_rate_sar?: number;
  processing_time_days?: number;
  validity_days?: number;
  documents_required?: string[];
  special_conditions?: string;
  commission_percent?: number;
  is_active?: boolean;
  summer_rate_multiplier?: number;
  winter_rate_multiplier?: number;
}

export function normalizeVisaCode(code: string): string {
  return code.toUpperCase().replace(/\s+/g, "_");
}
