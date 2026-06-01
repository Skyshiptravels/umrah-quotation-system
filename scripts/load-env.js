const fs = require("fs");
const path = require("path");
const dns = require("dns");

/** Load .env.local then .env into process.env (does not override existing vars). */
function loadEnvFiles() {
  const root = path.join(__dirname, "..");
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(root, file);
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function normalizeConnectionString(connectionString) {
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

function getPoolConfig(connectionString) {
  const isSupabase =
    connectionString.includes("supabase.co") ||
    connectionString.includes("supabase.com") ||
    connectionString.includes("pooler.supabase.com");
  if (isSupabase) {
    dns.setDefaultResultOrder("ipv6first");
  }
  return {
    connectionString: normalizeConnectionString(connectionString),
    connectionTimeoutMillis: 15000,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  };
}

module.exports = { loadEnvFiles, getPoolConfig };
