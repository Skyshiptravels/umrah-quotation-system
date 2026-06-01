import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { capturePriceSnapshot } from "@/lib/services/quotation-service";
import { refreshClientStatsFromQuotation } from "@/lib/services/client-service";
import { executeApprovalWorkflow } from "@/lib/services/quotation-workflow-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

async function approveQuotation(
  request: NextRequest,
  quotationId: string,
  userId: string,
  orgId: string
) {
  const existing = await query(
    `SELECT status FROM quotations WHERE id = $1 AND deleted_at IS NULL`,
    [quotationId]
  );
  if (!existing.rows[0]) return notFound("Quotation not found");

  if (!["DRAFT", "PENDING"].includes(existing.rows[0].status)) {
    return badRequest("Quotation cannot be approved in current status");
  }

  await capturePriceSnapshot(quotationId);

  const result = await query(
    `UPDATE quotations SET status = 'APPROVED', approved_by = $1, approved_at = NOW(), updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [userId, quotationId]
  );

  await logAudit(userId, "APPROVE", "quotation", quotationId, {});

  const workflow = await executeApprovalWorkflow(quotationId, orgId, userId);
  await refreshClientStatsFromQuotation(quotationId);

  return ok({
    quotation: result.rows[0],
    workflow,
    message: "Quotation approved — invoice, payment, and email processed",
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const roleErr = requireRole(auth, "MANAGER", "SUPER_ADMIN");
  if (roleErr) return roleErr;

  try {
    return await approveQuotation(
      request,
      params.id,
      auth.user.user_id,
      auth.user.organization_id
    );
  } catch (error) {
    return serverError("Approval failed", error);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: { id: string } }
) {
  return POST(request, ctx);
}
