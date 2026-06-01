/**
 * Move seeded hotels to the same organization as staff@umrah.com
 * Run: node scripts/fix-org-data.js
 */
const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

async function main() {
  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));
  try {
    const staff = await pool.query(
      `SELECT organization_id FROM users WHERE email = 'staff@umrah.com' AND deleted_at IS NULL`
    );
    if (!staff.rows[0]) {
      console.error("staff@umrah.com not found");
      process.exit(1);
    }
    const orgId = staff.rows[0].organization_id;

    const updated = await pool.query(
      `UPDATE hotels SET organization_id = $1, updated_at = NOW()
       WHERE deleted_at IS NULL RETURNING name, city`,
      [orgId]
    );

    console.log(`✓ Moved ${updated.rowCount} hotel(s) to staff organization:`);
    updated.rows.forEach((r) => console.log(`  - ${r.name} (${r.city})`));
  } finally {
    await pool.end();
  }
}

main();
