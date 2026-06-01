import { NextRequest } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ok, badRequest, serverError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return badRequest("Email is required");
    }

    const normalized = email.toLowerCase().trim();
    const result = await query(
      `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL AND is_active = true`,
      [normalized]
    );

    if (result.rows[0]) {
      const userId = result.rows[0].id;
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [userId, token, expiresAt]
      );

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
      const resetLink = `${baseUrl.replace(/\/$/, "")}/reset-password/${token}`;

      await sendEmail({
        to: normalized,
        subject: "Reset your Umrah Quotation password",
        html: `<p>Click the link below to reset your password (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
        text: `Reset your password: ${resetLink}`,
      });
    }

    return ok({
      message:
        "If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return serverError("Failed to process request", error);
  }
}
