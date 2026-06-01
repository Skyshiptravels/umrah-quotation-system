import { query } from "@/lib/db";

export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown> = {}
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entityType, entityId, JSON.stringify(changes)]
  );
}
