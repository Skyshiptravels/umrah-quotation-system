/**
 * Insert 6 demo users (all roles) into Supabase.
 *
 * Run from project root:
 *   node scripts/insert-users.js
 */

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

const DEMO_USERS = [
  {
    email: "admin@umrah.com",
    password: "Admin@123",
    role: "SUPER_ADMIN",
    full_name: "Super Admin",
    staff_margin_percent: 0,
  },
  {
    email: "manager@umrah.com",
    password: "Admin@123",
    role: "MANAGER",
    full_name: "Office Manager",
    staff_margin_percent: 8,
  },
  {
    email: "staff@umrah.com",
    password: "Admin@123",
    role: "STAFF",
    full_name: "Sales Staff",
    staff_margin_percent: 10,
  },
  {
    email: "agent@umrah.com",
    password: "Admin@123",
    role: "AGENT",
    full_name: "Travel Agent",
    staff_margin_percent: 12,
  },
  {
    email: "accounts@umrah.com",
    password: "Admin@123",
    role: "ACCOUNTS_MANAGER",
    full_name: "Accounts Manager",
    staff_margin_percent: 5,
  },
  {
    email: "viewer@umrah.com",
    password: "Admin@123",
    role: "VIEWER",
    full_name: "Read Only Viewer",
    staff_margin_percent: 0,
  },
];

const SALT_ROUNDS = 12;

async function getOrCreateOrganization(client) {
  const existing = await client.query(
    `SELECT id FROM organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await client.query(
    `INSERT INTO organizations (name) VALUES ('Demo Travel Agency') RETURNING id`
  );
  return created.rows[0].id;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool(getPoolConfig(connectionString));

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const organizationId = await getOrCreateOrganization(client);

      for (const user of DEMO_USERS) {
        const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
        await client.query(
          `INSERT INTO users (
            email, password_hash, organization_id, role, is_active,
            full_name, staff_margin_percent, must_change_password
          ) VALUES ($1, $2, $3, $4, TRUE, $5, $6, FALSE)
           ON CONFLICT (email) DO UPDATE SET
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             full_name = EXCLUDED.full_name,
             staff_margin_percent = EXCLUDED.staff_margin_percent,
             is_active = TRUE,
             updated_at = NOW(),
             deleted_at = NULL`,
          [
            user.email.toLowerCase(),
            hash,
            organizationId,
            user.role,
            user.full_name,
            user.staff_margin_percent,
          ]
        );
        console.log(`  ✓ ${user.email} (${user.role})`);
      }

      await client.query("COMMIT");

      console.log("");
      console.log("Success! 6 demo users are ready.");
      console.log("Password for all: Admin@123");
      console.log("");
      for (const u of DEMO_USERS) {
        console.log(`  ${u.email.padEnd(22)} → ${u.role}`);
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
