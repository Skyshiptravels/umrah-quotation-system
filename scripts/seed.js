const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required (.env.local or set $env:DATABASE_URL)");
    process.exit(1);
  }

  const pool = new Pool(getPoolConfig(connectionString));
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Organization — use same org as staff user so hotels are visible in the app
    let orgResult = await client.query(
      `SELECT organization_id AS id FROM users WHERE email = 'staff@umrah.com' AND deleted_at IS NULL LIMIT 1`
    );
    let orgId = orgResult.rows[0]?.id;
    if (!orgId) {
      orgResult = await client.query(
        `INSERT INTO organizations (name) VALUES ('Demo Travel Agency') RETURNING id`
      );
      orgId = orgResult.rows[0].id;
    }

    // Roles
    const roles = [
      ["SUPER_ADMIN", 65535],
      ["MANAGER", 1920],
      ["STAFF", 784],
      ["AGENT", 784],
      ["ACCOUNTS_MANAGER", 6144],
      ["VIEWER", 16384],
    ];
    for (const [name, mask] of roles) {
      await client.query(
        `INSERT INTO user_roles (name, permissions_bitmask) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [name, mask]
      );
    }

    // Users
    const passwordHash = await bcrypt.hash("Admin@123", 12);
    const users = [
      ["admin@umrah.com", "SUPER_ADMIN"],
      ["manager@umrah.com", "MANAGER"],
      ["staff@umrah.com", "STAFF"],
      ["agent@umrah.com", "AGENT"],
      ["accounts@umrah.com", "ACCOUNTS_MANAGER"],
      ["viewer@umrah.com", "VIEWER"],
    ];
    for (const [email, role] of users) {
      await client.query(
        `INSERT INTO users (email, password_hash, organization_id, role)
         VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        [email, passwordHash, orgId, role]
      );
    }

    // Visa categories (exact rates from spec)
    const visas = [
      ["VISA_NO_BRN", "Visa Without BRN", 535, 490],
      ["VISA_BRN_21", "Visa With BRN (21 Days)", 450, 490],
      ["VISA_BRN_28", "Visa With BRN (28 Days)", 480, 490],
      ["LONG_STAY_IQAMA", "Long-Stay With Iqama", 350, 490],
      ["LONG_STAY_NO_IQAMA", "Long-Stay Without Iqama", 600, 490],
    ];
    for (const [code, name, adult, infant] of visas) {
      await client.query(
        `INSERT INTO visa_categories (code, name, adult_child_rate_sar, infant_rate_sar)
         VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
        [code, name, adult, infant]
      );
    }

    // Vehicles
    const vehicles = [
      ["Car (Camry/Sonata)", 3, 350],
      ["Family Van", 6, 500],
      ["Luxury SUV (GMC)", 6, 700],
      ["Toyota Hiace", 9, 600],
      ["Coaster", 18, 900],
      ["Bus", 49, 1200],
      ["Sharing Bus (seat)", 1, 120],
    ];
    for (const [type, cap] of vehicles) {
      await client.query(
        `INSERT INTO vehicles (vehicle_type, capacity_pax) VALUES ($1, $2)
         ON CONFLICT (vehicle_type) DO NOTHING`,
        [type, cap]
      );
    }

    // Routes
    const routes = [
      ["JED-MAK", "Jeddah Airport → Makkah Hotel", "Jeddah", "Makkah", 80],
      ["MAK-MED", "Makkah → Madinah", "Makkah", "Madinah", 450],
      ["MED-MAK", "Madinah → Makkah", "Madinah", "Makkah", 450],
      ["MAK-JED", "Makkah → Jeddah Airport", "Makkah", "Jeddah", 80],
      ["MED-JED", "Madinah → Jeddah Airport", "Madinah", "Jeddah", 420],
      ["JED-MED", "Jeddah → Madinah", "Jeddah", "Madinah", 400],
    ];
    const routeIds = {};
    for (const [code, name, start, end, dist] of routes) {
      const ex = await client.query(
        `SELECT id FROM transport_routes WHERE name = $1`,
        [name]
      );
      if (ex.rows[0]) {
        routeIds[code] = ex.rows[0].id;
      } else {
        const r = await client.query(
          `INSERT INTO transport_routes (name, start_city, end_city, distance_km)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [name, start, end, dist]
        );
        routeIds[code] = r.rows[0].id;
      }
    }

    // Transport rates for all routes
    const vehicleRates = [
      ["Car (Camry/Sonata)", 350, false],
      ["Family Van", 500, false],
      ["Luxury SUV (GMC)", 700, false],
      ["Toyota Hiace", 600, false],
      ["Coaster", 900, false],
      ["Bus", 1200, false],
      ["Sharing Bus (seat)", 120, true],
    ];
    for (const routeId of Object.values(routeIds)) {
      for (const [vType, price, sharing] of vehicleRates) {
        await client.query(
          `INSERT INTO transport_rates (route_id, vehicle_type, price_sar, is_sharing)
           VALUES ($1, $2, $3, $4) ON CONFLICT (route_id, vehicle_type) DO NOTHING`,
          [routeId, vType, price, sharing]
        );
      }
    }

    // Hotels - Al Kiswah Towers Makkah (verified test case)
    let makkahHotelId;
    const makkahCheck = await client.query(
      `SELECT id FROM hotels WHERE name = 'Al Kiswah Towers' AND deleted_at IS NULL`
    );
    if (makkahCheck.rows[0]) {
      makkahHotelId = makkahCheck.rows[0].id;
    } else {
      const h = await client.query(
        `INSERT INTO hotels (organization_id, name, city, address, meal_plan_bb_premium_sar)
         VALUES ($1, 'Al Kiswah Towers', 'Makkah', 'Near Haram', 50) RETURNING id`,
        [orgId]
      );
      makkahHotelId = h.rows[0].id;

      const makkahRooms = [
        ["Single", 150, 1],
        ["Double", 180, 2],
        ["Triple", 280, 3],
        ["Quad", 228, 4],
      ];
      for (const [type, price, occ] of makkahRooms) {
        await client.query(
          `INSERT INTO hotel_rooms (hotel_id, room_type, base_price_sar, max_occupancy)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [makkahHotelId, type, price, occ]
        );
      }

      await client.query(
        `INSERT INTO hotel_seasons (hotel_id, start_date, end_date, season_multiplier)
         VALUES ($1, '2025-01-01', '2025-12-31', 1.0)`,
        [makkahHotelId]
      );
      await client.query(
        `INSERT INTO hotel_commissions (hotel_id, commission_rate_percent) VALUES ($1, 0)`,
        [makkahHotelId]
      );
    }

    // Madinah hotel - prices tuned for 1,784 SAR (4 nights, 1 Quad + 1 Triple, RO)
    let madinahHotelId;
    const medCheck = await client.query(
      `SELECT id FROM hotels WHERE name = 'Al Eiman Royal' AND deleted_at IS NULL`
    );
    if (medCheck.rows[0]) {
      madinahHotelId = medCheck.rows[0].id;
    } else {
      const h = await client.query(
        `INSERT INTO hotels (organization_id, name, city, address, meal_plan_bb_premium_sar)
         VALUES ($1, 'Al Eiman Royal', 'Madinah', 'Near Masjid Nabawi', 50) RETURNING id`,
        [orgId]
      );
      madinahHotelId = h.rows[0].id;

      const madinahRooms = [
        ["Single", 120, 1],
        ["Double", 150, 2],
        ["Triple", 268, 3],
        ["Quad", 178, 4],
      ];
      for (const [type, price, occ] of madinahRooms) {
        await client.query(
          `INSERT INTO hotel_rooms (hotel_id, room_type, base_price_sar, max_occupancy)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [madinahHotelId, type, price, occ]
        );
      }

      await client.query(
        `INSERT INTO hotel_seasons (hotel_id, start_date, end_date, season_multiplier)
         VALUES ($1, '2025-01-01', '2025-12-31', 1.0)`,
        [madinahHotelId]
      );
      await client.query(
        `INSERT INTO hotel_commissions (hotel_id, commission_rate_percent) VALUES ($1, 0)`,
        [madinahHotelId]
      );
    }

    await client.query("COMMIT");
    console.log("Seed completed successfully");
    console.log("Default password for all users: Admin@123");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
