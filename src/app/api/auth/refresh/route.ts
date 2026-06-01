import {
  getRefreshTokenFromCookie,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
} from "@/lib/auth";
import { badRequest, ok, unauthorized } from "@/lib/api-utils";

export async function POST() {
  const refreshToken = getRefreshTokenFromCookie();
  if (!refreshToken) {
    return unauthorized("No refresh token");
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const access_token = signAccessToken(payload);
    const new_refresh = signRefreshToken(payload);
    setRefreshCookie(new_refresh);
    return ok({ access_token });
  } catch {
    return unauthorized("Invalid refresh token");
  }
}
