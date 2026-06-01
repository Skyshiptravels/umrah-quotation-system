const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

async function main() {
  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));
  try {
    const orgs = await pool.query(`SELECT id, name FROM organizations ORDER BY created_at`);
    console.log("\nOrganizations:");
    console.table(orgs.rows);

    const users = await pool.query(
      `SELECT email, organization_id, role FROM users WHERE deleted_at IS NULL ORDER BY email`
    );
    console.log("\nUsers:");
    console.table(users.rows);

    const hotels = await pool.query(
      `SELECT h.id, h.name, h.city, h.organization_id FROM hotels h WHERE deleted_at IS NULL`
    );
    console.log("\nHotels:");
    console.table(hotels.rows);

    const staff = users.rows.find((u) => u.email === "staff@umrah.com");
    if (staff) {
      const staffHotels = hotels.rows.filter((h) => h.organization_id === staff.organization_id);
      console.log(`\nHotels visible to staff@umrah.com (same org): ${staffHotels.length}`);
      staffHotels.forEach((h) => console.log(`  - ${h.name} (${h.city})`));
    }
  } finally {
    await pool.end();
  }
}

main();
