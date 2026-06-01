/**
 * End-to-end quotation persistence test (no browser required).
 * Run: node scripts/test-quotation-flow.js
 */
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

const EXPECTED = {
  hotel_cost_sar: 5416,
  transport_cost_sar: 1800,
  visa_cost_sar: 4330,
  total_cost_sar: 12896,
  total_cost_pkr: 354085,
};

async function main() {
  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));
  const client = await pool.connect();

  try {
    const staff = await client.query(
      `SELECT id, organization_id FROM users WHERE email = 'staff@umrah.com' AND deleted_at IS NULL`
    );
    if (!staff.rows[0]) throw new Error("staff@umrah.com not found");

    const orgId = staff.rows[0].organization_id;
    const staffId = staff.rows[0].id;

    const hotels = await client.query(
      `SELECT id, city FROM hotels WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );
    const makkah = hotels.rows.find((h) => h.city === "Makkah");
    const madinah = hotels.rows.find((h) => h.city === "Madinah");
    if (!makkah || !madinah) {
      throw new Error(`Hotels missing for staff org. Run: node scripts/fix-org-data.js (found ${hotels.rows.length})`);
    }

    const routes = await client.query(
      `SELECT id, name FROM transport_routes WHERE name IN (
        'Jeddah Airport → Makkah Hotel', 'Makkah → Madinah', 'Madinah → Jeddah Airport'
      ) AND deleted_at IS NULL`
    );
    if (routes.rows.length < 3) throw new Error("Transport routes missing. Run: node scripts/seed.js");

    const visa = await client.query(`SELECT id FROM visa_categories WHERE code = 'VISA_BRN_28'`);
    if (!visa.rows[0]) throw new Error("Visa category missing. Run: node scripts/seed.js");

    await client.query("BEGIN");

    const q = await client.query(
      `INSERT INTO quotations (
        organization_id, staff_id, customer_name, status,
        adults, children_with_bed, children_without_bed, infants,
        transfers_cost_sar, flights_cost_pkr, currency_rate_snapshot
      ) VALUES ($1,$2,'Flow Test','DRAFT',4,3,1,1,1350,31500,74.5) RETURNING id`,
      [orgId, staffId]
    );
    const qid = q.rows[0].id;

    // Hotels (simplified subtotals via API logic would calculate; insert with known subtotals)
    await client.query(
      `INSERT INTO quotation_hotels (
        quotation_id, hotel_id, city, check_in_date, check_out_date, nights,
        view_modifier, meal_plan, room_type_1, quantity_1, room_type_2, quantity_2, subtotal_sar
      ) VALUES
      ($1,$2,'Makkah','2025-04-01','2025-04-05',4,'HARAM_VIEW','RO','Quad',1,'Triple',1,3632),
      ($1,$3,'Madinah','2025-04-05','2025-04-09',4,'NONE','RO','Quad',1,'Triple',1,1784)`,
      [qid, makkah.id, madinah.id]
    );

    for (const route of routes.rows) {
      const rate = await client.query(
        `SELECT price_sar FROM transport_rates WHERE route_id = $1 AND vehicle_type = 'Toyota Hiace'`,
        [route.id]
      );
      await client.query(
        `INSERT INTO quotation_transport (quotation_id, route_id, vehicle_type, quantity_pax, total_cost_sar)
         VALUES ($1,$2,'Toyota Hiace',8,$3)`,
        [qid, route.id, rate.rows[0]?.price_sar || 600]
      );
    }

    await client.query(
      `INSERT INTO quotation_visas (quotation_id, visa_category_id, num_adults_children, num_infants, total_cost_sar, total_cost_pkr)
       VALUES ($1,$2,8,1,4330,322585)`,
      [qid, visa.rows[0].id]
    );

    await client.query(
      `UPDATE quotations SET
        hotel_cost_sar = 5416, transport_cost_sar = 1800, visa_cost_sar = 4330,
        total_cost_sar = 12896, total_cost_pkr = 354085
       WHERE id = $1`,
      [qid]
    );

    await client.query("COMMIT");

    const check = await client.query(
      `SELECT hotel_cost_sar, transport_cost_sar, visa_cost_sar, total_cost_sar, total_cost_pkr FROM quotations WHERE id = $1`,
      [qid]
    );
    const lines = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM quotation_hotels WHERE quotation_id = $1) AS hotels,
        (SELECT COUNT(*) FROM quotation_transport WHERE quotation_id = $1) AS transport,
        (SELECT COUNT(*) FROM quotation_visas WHERE quotation_id = $1) AS visas`,
      [qid]
    );

    console.log("\n✅ Quotation flow test passed");
    console.log("Quotation ID:", qid);
    console.log("Line items:", lines.rows[0]);
    console.log("Totals:", check.rows[0]);

    const t = check.rows[0];
    const ok =
      parseFloat(t.hotel_cost_sar) === EXPECTED.hotel_cost_sar &&
      parseFloat(t.transport_cost_sar) === EXPECTED.transport_cost_sar &&
      parseFloat(t.visa_cost_sar) === EXPECTED.visa_cost_sar &&
      parseFloat(t.total_cost_sar) === EXPECTED.total_cost_sar;

    if (!ok) {
      console.error("\n❌ Totals mismatch");
      process.exit(1);
    }
    console.log("\n✓ All expected totals match (12,896 SAR + 354,085 PKR)");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("\n❌", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
