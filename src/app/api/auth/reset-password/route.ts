import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { ok, badRequest, serverError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return badRequest("Token and password are required");
    }

    if (typeof password !== "string" || password.length < 8) {
      return badRequest("Password must be at least 8 characters");
    }

    const tokenResult = await query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (!tokenResult.rows[0]) {
      return badRequest("Invalid or expired reset link");
    }

    const userId = tokenResult.rows[0].user_id;
    const hashed = await hashPassword(password);

    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      hashed,
      userId,
    ]);
    await query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);

    return ok({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return serverError("Failed to reset password", error);
  }
}
