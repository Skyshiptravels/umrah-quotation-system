import { query } from "@/lib/db";
import { Role } from "@/types";

export interface UserAdminRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  staff_margin_percent: string;
  organization_id: string;
  last_login_at: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UserAdminDto {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  commission_rate: number;
  organization_id: string;
  last_login_at: string | null;
  must_change_password: boolean;
  created_at: string;
}

const VALID_ROLES: Role[] = [
  "SUPER_ADMIN",
  "MANAGER",
  "STAFF",
  "AGENT",
  "ACCOUNTS_MANAGER",
  "VIEWER",
];

export function mapUserRow(row: UserAdminRow): UserAdminDto {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name || row.email.split("@")[0],
    role: row.role,
    is_active: row.is_active,
    commission_rate: parseFloat(row.staff_margin_percent) || 10,
    organization_id: row.organization_id,
    last_login_at: row.last_login_at,
    must_change_password: row.must_change_password ?? false,
    created_at: row.created_at,
  };
}

export async function logUserAudit(
  userId: string,
  action: string,
  changedBy: string | null,
  changes: Record<string, unknown> = {}
): Promise<void> {
  await query(
    `INSERT INTO user_audit_log (user_id, action, changed_by, changes_json)
     VALUES ($1, $2, $3, $4)`,
    [userId, action, changedBy, JSON.stringify(changes)]
  );
}

export async function logDeactivationHistory(
  userId: string,
  action: "DEACTIVATE" | "REACTIVATE",
  changedBy: string,
  reason?: string
): Promise<void> {
  await query(
    `INSERT INTO user_deactivation_history (user_id, action, reason, changed_by)
     VALUES ($1, $2, $3, $4)`,
    [userId, action, reason || null, changedBy]
  );
}

export function validateRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}

export async function listUsers(organizationId: string): Promise<UserAdminDto[]> {
  const result = await query<UserAdminRow>(
    `SELECT id, email, full_name, role, is_active, staff_margin_percent,
            organization_id, last_login_at, must_change_password, created_at, updated_at
     FROM users
     WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows.map(mapUserRow);
}

export async function getUserById(
  id: string,
  organizationId: string
): Promise<UserAdminDto | null> {
  const result = await query<UserAdminRow>(
    `SELECT id, email, full_name, role, is_active, staff_margin_percent,
            organization_id, last_login_at, must_change_password, created_at, updated_at
     FROM users
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, organizationId]
  );
  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

export async function getUserActivity(userId: string) {
  const audit = await query(
    `SELECT ual.id, ual.action, ual.changes_json, ual.created_at,
            cu.email as changed_by_email
     FROM user_audit_log ual
     LEFT JOIN users cu ON cu.id = ual.changed_by
     WHERE ual.user_id = $1
     ORDER BY ual.created_at DESC
     LIMIT 50`,
    [userId]
  );

  const deactivation = await query(
    `SELECT udh.id, udh.action, udh.reason, udh.created_at, cu.email as changed_by_email
     FROM user_deactivation_history udh
     LEFT JOIN users cu ON cu.id = udh.changed_by
     WHERE udh.user_id = $1
     ORDER BY udh.created_at DESC
     LIMIT 20`,
    [userId]
  );

  return { audit: audit.rows, deactivation: deactivation.rows };
}
