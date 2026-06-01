import { NextRequest } from "next/server";
import {
  getOverduePayments,
  getPaymentSummary,
  listPayments,
  markPaymentPaid,
  recordPayment,
} from "@/lib/services/payment-service";
import { requireAuth, isAuthContext, requireRole, ok, badRequest, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const view = request.nextUrl.searchParams.get("view");
  const status = request.nextUrl.searchParams.get("status") || undefined;

  try {
    if (view === "summary") {
      return ok(await getPaymentSummary(auth.user.organization_id));
    }
    if (view === "overdue") {
      return ok({ data: await getOverduePayments(auth.user.organization_id) });
    }
    return ok({ data: await listPayments(auth.user.organization_id, status) });
  } catch (error) {
    return serverError("Failed to load payments", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  try {
    const body = await request.json();
    if (!body.client_id || body.amount_due == null) {
      return badRequest("client_id and amount_due are required");
    }
    const payment = await recordPayment(auth.user.organization_id, body);
    return ok({ payment }, 201);
  } catch (error) {
    return serverError("Failed to record payment", error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  const { payment_id, amount_paid } = await request.json();
  if (!payment_id) return badRequest("payment_id is required");

  const payment = await markPaymentPaid(payment_id, auth.user.organization_id, amount_paid);
  if (!payment) return badRequest("Payment not found");
  return ok({ payment });
}
