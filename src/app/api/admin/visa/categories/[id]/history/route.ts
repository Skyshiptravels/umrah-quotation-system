import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import {
  getVisaRateHistory,
  getVisaCategoryById,
} from "@/lib/services/visa-admin-service";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  notFound,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_VISA);
  if (permErr) return permErr;

  const category = await getVisaCategoryById(params.id);
  if (!category) return notFound("Visa category not found");

  try {
    const history = await getVisaRateHistory(params.id);
    return ok({ data: history });
  } catch (error) {
    return serverError("Failed to load visa history", error);
  }
}
