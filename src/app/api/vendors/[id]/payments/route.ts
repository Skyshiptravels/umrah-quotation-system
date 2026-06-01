import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import {
  getVendorPayments,
  markVendorPaymentPaid,
  recordVendorPayment,
} from "@/lib/services/vendor-service";
import {
  requireAuth,
  isAuthContext,
  requireRole,
  ok,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-utils";

async function vendorExists(vendorId: string, orgId: string) {
  const r = await query(
    `SELECT id FROM vendors WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [vendorId, orgId]
  );
  return Boolean(r.rows[0]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  if (!(await vendorExists(params.id, auth.user.organization_id))) {
    return notFound("Vendor not found");
  }

  const payments = await getVendorPayments(params.id);
  return ok({ data: payments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  const permErr = requireRole(auth, "SUPER_ADMIN", "MANAGER", "ACCOUNTS_MANAGER");
  if (permErr) return permErr;

  if (!(await vendorExists(params.id, auth.user.organization_id))) {
    return notFound("Vendor not found");
  }

  try {
    const body = await request.json();

    if (body.action === "mark_paid" && body.payment_id) {
      const payment = await markVendorPaymentPaid(
        body.payment_id,
        params.id,
        auth.user.organization_id
      );
      if (!payment) return notFound("Payment not found");
      return ok({ payment });
    }

    if (body.amount == null) return badRequest("amount is required");

    const payment = await recordVendorPayment(
      auth.user.organization_id,
      params.id,
      body
    );
    return ok({ payment }, 201);
  } catch (error) {
    return serverError("Failed to record payment", error);
  }
}
