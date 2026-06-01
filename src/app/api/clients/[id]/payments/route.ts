import { NextRequest } from "next/server";
import { getClientById, getClientPayments } from "@/lib/services/client-service";
import { markPaymentPaid, recordPayment } from "@/lib/services/payment-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "STAFF", "AGENT", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  try {
    const client = await getClientById(params.id, auth.user.organization_id);
    if (!client) return notFound("Client not found");
    const data = await getClientPayments(params.id);
    return ok({ data });
  } catch (error) {
    return serverError("Failed to load client payments", error);
  }
}

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

    if (body.action === "mark_paid") {
      if (!body.payment_id) return badRequest("payment_id is required");
      const payment = await markPaymentPaid(
        body.payment_id,
        auth.user.organization_id,
        body.amount_paid
      );
      if (!payment) return notFound("Payment not found");
      return ok({ payment });
    }

    if (body.amount_due == null) {
      return badRequest("amount_due is required");
    }

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
    return ok({ payment }, 201);
  } catch (error) {
    return serverError("Failed to record payment", error);
  }
}
