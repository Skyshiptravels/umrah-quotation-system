import { NextRequest } from "next/server";
import { updateClientPayment } from "@/lib/services/payment-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    const payment = await updateClientPayment(
      params.paymentId,
      params.id,
      auth.user.organization_id,
      body
    );
    if (!payment) return notFound("Payment not found");

    return ok({
      payment,
      message: `Payment updated: ${payment.amount_paid} SAR received`,
    });
  } catch (error) {
    return serverError("Failed to update payment", error);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: { id: string; paymentId: string } }
) {
  return PUT(request, ctx);
}
