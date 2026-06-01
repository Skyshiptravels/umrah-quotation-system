const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("FAIL: DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool(getPoolConfig(connectionString));
  try {
    const version = await pool.query("SELECT version()");
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log("OK: Connected to PostgreSQL");
    console.log(version.rows[0].version.split(",")[0]);
    console.log(`Tables in public schema: ${tables.rows.length}`);
    tables.rows.forEach((r) => console.log(`  - ${r.table_name}`));
  } catch (err) {
    console.error("FAIL:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
