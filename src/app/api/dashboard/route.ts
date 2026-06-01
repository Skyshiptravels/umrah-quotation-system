import { NextRequest } from "next/server";
import { getDashboardMetrics } from "@/lib/services/dashboard-service";
import { requireAuth, isAuthContext, ok, serverError } from "@/lib/api-utils";
import { Role } from "@/types";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const data = await getDashboardMetrics(auth.user.organization_id, auth.user.role as Role);
    return ok(data);
  } catch (error) {
    return serverError("Failed to load dashboard", error);
  }
}
