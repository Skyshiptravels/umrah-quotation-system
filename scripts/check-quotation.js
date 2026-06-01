/**
 * Inspect quotation line items in database.
 * Usage: node scripts/check-quotation.js <quotation-id>
 * Or:    node scripts/check-quotation.js  (shows latest quotation)
 */
const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

async function main() {
  const quotationId = process.argv[2];
  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));

  try {
    let id = quotationId;
    if (!id) {
      const latest = await pool.query(
        `SELECT id, customer_name, hotel_cost_sar, transport_cost_sar, visa_cost_sar,
                transfers_cost_sar, total_cost_sar, total_cost_pkr
         FROM quotations WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`
      );
      if (!latest.rows[0]) {
        console.log("No quotations found.");
        return;
      }
      id = latest.rows[0].id;
      console.log("\nLatest quotation:", latest.rows[0]);
    }

    const q = await pool.query(`SELECT * FROM quotations WHERE id = $1`, [id]);
    console.log("\nQuotation totals:", {
      hotel_cost_sar: q.rows[0]?.hotel_cost_sar,
      transport_cost_sar: q.rows[0]?.transport_cost_sar,
      visa_cost_sar: q.rows[0]?.visa_cost_sar,
      transfers_cost_sar: q.rows[0]?.transfers_cost_sar,
      total_cost_sar: q.rows[0]?.total_cost_sar,
    });

    const hotels = await pool.query(
      `SELECT id, city, nights, subtotal_sar, room_type_1, quantity_1 FROM quotation_hotels WHERE quotation_id = $1`,
      [id]
    );
    const transport = await pool.query(
      `SELECT id, vehicle_type, total_cost_sar FROM quotation_transport WHERE quotation_id = $1`,
      [id]
    );
    const visas = await pool.query(
      `SELECT id, total_cost_sar, total_cost_pkr FROM quotation_visas WHERE quotation_id = $1`,
      [id]
    );

    console.log(`\nquotation_hotels (${hotels.rows.length} rows):`);
    console.table(hotels.rows);
    console.log(`\nquotation_transport (${transport.rows.length} rows):`);
    console.table(transport.rows);
    console.log(`\nquotation_visas (${visas.rows.length} rows):`);
    console.table(visas.rows);

    if (hotels.rows.length === 0 && transport.rows.length === 0 && visas.rows.length === 0) {
      console.log("\n⚠️  No line items saved — wizard API calls likely failed silently before fix.");
      console.log("   Run: node scripts/seed.js");
      console.log("   Then create a new quotation.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
