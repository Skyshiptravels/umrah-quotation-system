const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

async function main() {
  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));
  try {
    const users = await pool.query(
      `SELECT email, role, is_active, LEFT(password_hash, 20) AS hash_prefix FROM users ORDER BY email`
    );
    console.log("\nUsers in database:");
    console.table(users.rows);

    const testEmail = "staff@umrah.com";
    const testPassword = "Admin@123";
    const row = await pool.query(
      `SELECT password_hash FROM users WHERE email = $1`,
      [testEmail]
    );

    if (!row.rows[0]) {
      console.log("\n❌ staff@umrah.com NOT FOUND — run: node scripts/insert-users.js");
      process.exit(1);
    }

    const ok = await bcrypt.compare(testPassword, row.rows[0].password_hash);
    console.log(`\nPassword test for ${testEmail} / Admin@123:`, ok ? "✅ MATCH" : "❌ NO MATCH");
    if (!ok) {
      console.log("Fix: node scripts/insert-users.js");
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
