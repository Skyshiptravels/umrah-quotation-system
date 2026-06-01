import { clearRefreshCookie } from "@/lib/auth";
import { ok } from "@/lib/api-utils";

export async function POST() {
  clearRefreshCookie();
  return ok({ message: "Logged out successfully" });
}
