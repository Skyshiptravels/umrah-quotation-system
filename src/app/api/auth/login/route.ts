import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import {
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  setRefreshCookie,
} from "@/lib/auth";
import { badRequest, ok, serverError } from "@/lib/api-utils";
import { JwtPayload, Role } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequest("Email and password are required");
    }

    const result = await query(
      `SELECT id, email, password_hash, organization_id, role, is_active
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return badRequest("Invalid email or password");
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return badRequest("Invalid email or password");
    }

    await query(`UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [
      user.id,
    ]);

    const payload: JwtPayload = {
      user_id: user.id,
      email: user.email,
      role: user.role as Role,
      organization_id: user.organization_id,
    };

    const access_token = signAccessToken(payload);
    const refresh_token = signRefreshToken(payload);
    setRefreshCookie(refresh_token);

    return ok({
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    const err = error as NodeJS.ErrnoException & { hostname?: string };
    if (err.code === "ENOTFOUND" && err.hostname?.includes("supabase")) {
      return serverError(
        "Cannot reach Supabase database (DNS ENOTFOUND). Use the Session pooler connection string from Supabase Dashboard → Settings → Database, or enable IPv6. See README."
      );
    }
    return serverError();
  }
}
