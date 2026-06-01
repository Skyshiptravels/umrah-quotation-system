import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getUserActivity, getUserById } from "@/lib/services/user-admin-service";
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

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  const user = await getUserById(params.id, auth.user.organization_id);
  if (!user) return notFound("User not found");

  try {
    const activity = await getUserActivity(params.id);
    return ok(activity);
  } catch (error) {
    return serverError("Failed to load activity", error);
  }
}
