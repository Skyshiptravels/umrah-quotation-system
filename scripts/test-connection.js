/**
 * Supabase / PostgreSQL connection diagnostic.
 *
 * Run from project root:
 *   node scripts/test-connection.js
 */

const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

function maskConnectionString(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return url.replace(/:([^:@/]+)@/, ":****@");
  }
}

function printHeader(title) {
  console.log("");
  console.log("=".repeat(50));
  console.log(title);
  console.log("=".repeat(50));
}

async function countTable(pool, tableName) {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return result.rows[0].count;
}

async function main() {
  printHeader("Supabase connection test");

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log("");
    console.log("❌ FAILED: DATABASE_URL is not set");
    console.log("");
    console.log("Fix: Create .env.local in the project root with:");
    console.log(
      "  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT.supabase.co:5432/postgres?sslmode=require"
    );
    process.exit(1);
  }

  console.log("");
  console.log("✓ Loaded .env.local");
  console.log("  URL:", maskConnectionString(connectionString));

  const pool = new Pool(getPoolConfig(connectionString));
  const start = Date.now();

  try {
    console.log("");
    console.log("Connecting...");

    const ping = await pool.query("SELECT NOW() AS server_time, current_database() AS db");
    const ms = Date.now() - start;

    console.log("");
    console.log(`✅ CONNECTION SUCCESS (${ms} ms)`);
    console.log("  Server time:", ping.rows[0].server_time);
    console.log("  Database:   ", ping.rows[0].db);

    const version = await pool.query("SELECT version()");
    console.log("  PostgreSQL: ", version.rows[0].version.split(",")[0]);

    printHeader("Table row counts");

    const tables = ["users", "organizations", "hotels"];

    for (const table of tables) {
      try {
        const count = await countTable(pool, table);
        console.log(`  ✓ ${table.padEnd(16)} ${count} row(s)`);
      } catch (err) {
        console.log(`  ✗ ${table.padEnd(16)} ERROR: ${err.message}`);
        console.log("    (Table may not exist — run: node scripts/migrate.js)");
      }
    }

    printHeader("Result");
    console.log("");
    console.log("✅ Database is connected and responding.");
    console.log("   You can run: npm run dev");
    console.log("");
  } catch (err) {
    const ms = Date.now() - start;

    console.log("");
    console.log(`❌ CONNECTION FAILED (${ms} ms)`);
    console.log("");
    console.log("Error:", err.message);
    console.log("");

    if (err.code) console.log("Code:", err.code);

    printHeader("Common fixes");

    const hints = [];

    if (err.message.includes("ENOTFOUND")) {
      hints.push("Host not found — check project ref in DATABASE_URL");
      hints.push("Supabase Dashboard → Settings → Database → Host");
      hints.push("Ensure project is not paused (free tier pauses after inactivity)");
    }
    if (err.message.includes("password authentication failed")) {
      hints.push("Wrong password — reset in Supabase → Settings → Database");
      hints.push("Update DATABASE_URL in .env.local");
    }
    if (err.message.includes("SSL") || err.message.includes("encryption")) {
      hints.push('Add ?sslmode=require to the end of DATABASE_URL');
    }
    if (err.message.includes("ETIMEDOUT") || err.message.includes("timeout")) {
      hints.push("Firewall/VPN may block port 5432");
      hints.push("Try another network or Supabase SQL Editor to confirm DB is up");
    }
    if (err.message.includes("does not exist") && err.message.includes("relation")) {
      hints.push("Tables missing — run: node scripts/migrate.js");
      hints.push("Then seed: node scripts/seed.js");
    }

    if (hints.length === 0) {
      hints.push("Verify DATABASE_URL in .env.local matches Supabase → Connect → URI");
      hints.push("Use Direct connection (port 5432), not pooler (6543), for local tools");
    }

    hints.forEach((h) => console.log("  •", h));
    console.log("");

    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
