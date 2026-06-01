import dns from "node:dns";

/**
 * Supabase direct connections (db.*.supabase.co) are IPv6-only.
 * Windows + Node may fail with ENOTFOUND unless IPv6 is preferred or enabled.
 * Use Session pooler URI from Supabase Dashboard for IPv4 (Windows).
 */
export function isSupabaseUrl(connectionString: string): boolean {
  return (
    connectionString.includes("supabase.co") ||
    connectionString.includes("supabase.com") ||
    connectionString.includes("pooler.supabase.com")
  );
}

export function configureSupabaseDns(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (isSupabaseUrl(url)) {
    dns.setDefaultResultOrder("ipv6first");
  }
}

/** Remove sslmode from URL — pg v8+ treats sslmode=require as verify-full and ignores rejectUnauthorized. */
export function normalizeConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    const normalized = url.toString();
    return normalized.endsWith("?") ? normalized.slice(0, -1) : normalized;
  } catch {
    return connectionString
      .replace(/([?&])sslmode=[^&]*&?/g, "$1")
      .replace(/[?&]$/, "");
  }
}

export function getPgPoolOptions(connectionString: string) {
  const isSupabase = isSupabaseUrl(connectionString);

  return {
    connectionString: normalizeConnectionString(connectionString),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  };
}
