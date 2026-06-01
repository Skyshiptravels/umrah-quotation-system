import { NextRequest } from "next/server";
import { getInvoiceByQuotationId } from "@/lib/services/quotation-workflow-service";
import { requireAuth, isAuthContext, ok, notFound, serverError } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const invoice = await getInvoiceByQuotationId(params.id, auth.user.organization_id);
    if (!invoice) return notFound("Invoice not found");
    return ok({ invoice });
  } catch (error) {
    return serverError("Failed to load invoice", error);
  }
}
