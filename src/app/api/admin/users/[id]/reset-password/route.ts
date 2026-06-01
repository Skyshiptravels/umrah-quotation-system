import { NextRequest } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getUserById, logUserAudit } from "@/lib/services/user-admin-service";
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  notFound,
  serverError,
  PERMISSIONS,
} from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const permErr = requirePermission(auth, PERMISSIONS.MANAGE_USERS);
  if (permErr) return permErr;

  try {
    const user = await getUserById(params.id, auth.user.organization_id);
    if (!user) return notFound("User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [params.id]);
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [params.id, token, expiresAt]
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${token}`;

    await sendEmail({
      to: user.email,
      subject: "Password reset — Umrah Quotation System",
      html: `<p>An administrator requested a password reset for your account.</p><p><a href="${resetLink}">Reset password</a></p><p>Link expires in 24 hours.</p>`,
      text: `Reset your password: ${resetLink}`,
    });

    await logUserAudit(params.id, "PASSWORD_RESET", auth.user.user_id, {
      reset_link_sent: true,
    });

    const isDev = process.env.NODE_ENV !== "production";
    return ok({
      message: "Password reset link sent",
      ...(isDev ? { resetLink } : {}),
    });
  } catch (error) {
    return serverError("Failed to reset password", error);
  }
}
