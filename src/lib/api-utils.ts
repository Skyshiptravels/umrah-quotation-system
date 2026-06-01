import { NextRequest, NextResponse } from "next/server";
import {
  extractBearerToken,
  verifyAccessToken,
} from "@/lib/auth";
import { JwtPayload, PERMISSIONS, Role, ROLE_PERMISSIONS } from "@/types";

export interface AuthContext {
  user: JwtPayload;
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error", error?: unknown): NextResponse {
  if (error) {
    import("@/lib/sentry").then(({ captureException }) => captureException(error, { message }));
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function requireAuth(request: NextRequest): AuthContext | NextResponse {
  const token = extractBearerToken(request);
  if (!token) return unauthorized("Missing access token");

  try {
    const user = verifyAccessToken(token);
    return { user };
  } catch {
    return unauthorized("Invalid or expired access token");
  }
}

export function requireRole(
  auth: AuthContext,
  ...roles: Role[]
): NextResponse | null {
  if (!roles.includes(auth.user.role)) {
    return forbidden(`Requires one of roles: ${roles.join(", ")}`);
  }
  return null;
}

export function requirePermission(
  auth: AuthContext,
  permission: number
): NextResponse | null {
  const mask = ROLE_PERMISSIONS[auth.user.role];
  if ((mask & permission) !== permission) {
    return forbidden("Insufficient permissions");
  }
  return null;
}

export function isAuthContext(
  result: AuthContext | NextResponse
): result is AuthContext {
  return "user" in result;
}

export { PERMISSIONS };
