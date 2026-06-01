import { NextRequest } from "next/server";
import { recordPayment } from "@/lib/services/payment-service";
import { getClientById } from "@/lib/services/client-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    if (body.amount_due == null) return badRequest("amount_due is required");

    const client = await getClientById(params.id, auth.user.organization_id);
    if (!client) return notFound("Client not found");

    const payment = await recordPayment(auth.user.organization_id, {
      client_id: params.id,
      quotation_id: body.quotation_id,
      amount_due: Number(body.amount_due),
      amount_paid: body.amount_paid != null ? Number(body.amount_paid) : undefined,
      payment_due_date: body.payment_due_date,
      invoice_number: body.invoice_number,
    });

    return ok({ payment, message: "Payment recorded" }, 201);
  } catch (error) {
    return serverError("Failed to record payment", error);
  }
}
