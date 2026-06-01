import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"

export interface AuthContext {
  userId: string
  orgId: string
  email: string
  role: string
}

/** Extract and verify JWT from Authorization: Bearer header. */
export function getAuthContext(request: NextRequest): AuthContext | null {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error("Auth error: JWT_SECRET is not configured")
    return null
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload

    if (!payload.sub || !payload.org) return null

    return {
      userId: String(payload.sub),
      orgId: String(payload.org),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "staff"),
    }
  } catch (error) {
    console.error("Auth error: invalid token", error)
    return null
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
