import { NextRequest } from "next/server";
import { generateInvoiceFromQuotation } from "@/lib/services/quotation-workflow-service";
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
    const invoice = await generateInvoiceFromQuotation(
      params.id,
      auth.user.organization_id,
      auth.user.user_id
    );
    if (!invoice) return badRequest("Could not generate invoice");
    return ok({ invoice }, 201);
  } catch (error) {
    return serverError("Failed to generate invoice", error);
  }
}
