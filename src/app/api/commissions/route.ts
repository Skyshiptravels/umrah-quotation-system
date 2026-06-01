import { NextRequest } from "next/server";
import { getStaffCommissions } from "@/lib/services/commission-service";
import { requireAuth, isAuthContext, ok, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const data = await getStaffCommissions(auth.user.user_id);
    return ok(data);
  } catch (error) {
    console.error("Commissions error:", error);
    return serverError("Failed to load commissions");
  }
}
