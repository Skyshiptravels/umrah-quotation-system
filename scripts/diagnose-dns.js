/**
 * Diagnose why Supabase host fails with ENOTFOUND on Windows.
 * Run: node scripts/diagnose-dns.js
 */

const dns = require("dns").promises;
const { loadEnvFiles } = require("./load-env");

loadEnvFiles();

async function main() {
  const url = process.env.DATABASE_URL || "";
  let host = "db.bboxotgtgseympaxnvqk.supabase.co";
  try {
    host = new URL(url).hostname;
  } catch {
    /* use default */
  }

  console.log("\nDNS diagnostic for:", host);
  console.log("");

  try {
    const [ipv4, ipv6] = await Promise.all([
      dns.resolve4(host).catch(() => []),
      dns.resolve6(host).catch(() => []),
    ]);

    console.log("IPv4 (A records):", ipv4.length ? ipv4.join(", ") : "NONE");
    console.log("IPv6 (AAAA records):", ipv6.length ? ipv6.join(", ") : "NONE");

    if (ipv4.length === 0 && ipv6.length > 0) {
      console.log("");
      console.log("⚠️  This host is IPv6-only.");
      console.log("   Node on Windows often returns ENOTFOUND if IPv6 is disabled.");
      console.log("");
      console.log("Fix options:");
      console.log("  1. Enable IPv6 on your router/PC network adapter");
      console.log("  2. Use Supabase Session pooler URI (IPv4) from Dashboard:");
      console.log("     Project Settings → Database → Connection string → Session pooler");
      console.log("  3. Set NODE_OPTIONS=--dns-result-order=ipv6first (already set in app)");
    }

    if (ipv4.length === 0 && ipv6.length === 0) {
      console.log("");
      console.log("❌ Host does not resolve — wrong project ref or project paused/deleted.");
      console.log("   Copy the exact host from Supabase Dashboard → Settings → Database.");
    } else {
      console.log("");
      console.log("✓ DNS resolves. Run: node scripts/test-connection.js");
    }
  } catch (err) {
    console.error("DNS lookup failed:", err.message);
  }

  console.log("");
}

main();
