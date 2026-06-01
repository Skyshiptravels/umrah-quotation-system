import { NextRequest } from "next/server";
import { sendQuotationApprovalEmail } from "@/lib/services/quotation-workflow-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  serverError,
} from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "MANAGER", "SUPER_ADMIN", "STAFF", "AGENT");
  if (permErr) return permErr;

  try {
    const result = await sendQuotationApprovalEmail(
      params.id,
      auth.user.organization_id
    );
    return ok(result);
  } catch (error) {
    return serverError("Failed to send email", error);
  }
}
