import { NextRequest } from "next/server";
import { createApprovalPaymentRecord } from "@/lib/services/quotation-workflow-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  badRequest,
  serverError,
} from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "MANAGER", "SUPER_ADMIN", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  try {
    const payment = await createApprovalPaymentRecord(
      params.id,
      auth.user.organization_id
    );
    if (!payment) {
      return badRequest("Quotation has no linked client — payment not created");
    }
    return ok({ payment }, 201);
  } catch (error) {
    return serverError("Failed to create payment record", error);
  }
}
