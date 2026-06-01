/**
 * Seed 7 verified Madinah hotels with markaziya, distance, and room rates.
 * Run: node scripts/seed-madinah-hotels.js
 */
const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

/** Room rates derived from verified per-bed midpoints (Quad = rate × 4) */
function roomRates(bedRate) {
  return [
    ["Single", bedRate, 1],
    ["Double", bedRate * 2, 2],
    ["Triple", bedRate * 3, 3],
    ["Quad", bedRate * 4, 4],
  ];
}

const MADINAH_HOTELS = [
  {
    name: "KINAN MADINA",
    category: "ECONOMY_PLUS",
    distance_m: 900,
    address: "main qurban road, bilal masjid",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    bedRate: 30,
    amenities: ["WiFi", "Air-Con", "Breakfast", "Parking"],
    staffNotes: "Budget-friendly, good value — farthest but economical",
    cancellationPolicy: "Free cancellation up to 7 days before check-in",
  },
  {
    name: "DAR AIJYAL 1",
    category: "ECONOMY_PLUS",
    distance_m: 750,
    address: "shumalia ladies gate side",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    bedRate: 47,
    amenities: ["WiFi", "Air-Con", "Breakfast", "Laundry"],
    staffNotes: "Near Shumalia ladies gate — good for female groups",
    cancellationPolicy: "Free cancellation up to 7 days before check-in",
  },
  {
    name: "ABDULLAH FOUZAN (DYAR HIJAZ)",
    category: "ECONOMY_PLUS",
    distance_m: 600,
    address: "main qurban road, bilal masjid side",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    bedRate: 58,
    amenities: ["WiFi", "Air-Con", "Breakfast"],
    staffNotes: "Mid-range economy on Qurban Road",
    cancellationPolicy: "50% refund if cancelled within 7 days",
  },
  {
    name: "KARAM GOLDEN",
    category: "5_STAR",
    distance_m: 550,
    address: "main qurban road, bilal masjid side",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-15",
    seasonEnd: "2026-08-26",
    bedRate: 61,
    amenities: ["WiFi", "Air-Con", "Breakfast", "Restaurant"],
    staffNotes: "Premium comfort — earliest season start (15-Jun)",
    cancellationPolicy: "50% refund if cancelled within 7 days",
  },
  {
    name: "ANSAR PLUS",
    category: "ECONOMY_PLUS",
    distance_m: 500,
    address: "main qurban road, bilal masjid side",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    bedRate: 63,
    amenities: ["WiFi", "Air-Con", "Breakfast", "Parking"],
    staffNotes: "Balanced price and proximity",
    cancellationPolicy: "Free cancellation up to 7 days before check-in",
  },
  {
    name: "WIDYAR AL MADINA / ROU KHAIR",
    category: "5_STAR",
    distance_m: 350,
    address: "bab salam side after markaziya first row",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    bedRate: 67,
    amenities: ["WiFi", "Air-Con", "Breakfast", "Restaurant", "Laundry"],
    staffNotes: "Premium location near Bab Salam — good value for 5-star",
    cancellationPolicy: "50% refund if cancelled within 7 days",
  },
  {
    name: "ROU TAIBA",
    category: "5_STAR",
    distance_m: 100,
    address: "behind masjid ghamama",
    markaziya: "INSIDE",
    seasonStart: "2026-06-30",
    seasonEnd: "2026-08-26",
    bedRate: 63,
    amenities: ["WiFi", "Air-Con", "Breakfast", "Gym", "Restaurant"],
    staffNotes: "Best premium option — INSIDE markaziya, closest to Masjid (100M)",
    cancellationPolicy: "Non-refundable during peak season",
  },
];

async function upsertHotel(client, orgId, hotel) {
  const existing = await client.query(
    `SELECT id FROM hotels WHERE name = $1 AND city = 'Madinah' AND deleted_at IS NULL`,
    [hotel.name]
  );

  let hotelId;
  if (existing.rows[0]) {
    hotelId = existing.rows[0].id;
    await client.query(
      `UPDATE hotels SET
        organization_id = $1, address = $2, distance_m = $3, markaziya_status = $4,
        category = $5, amenities = $6, staff_notes = $7, cancellation_policy = $8,
        pricing_model = 'BOTH', updated_at = NOW()
       WHERE id = $9`,
      [
        orgId,
        hotel.address,
        hotel.distance_m,
        hotel.markaziya,
        hotel.category,
        hotel.amenities,
        hotel.staffNotes,
        hotel.cancellationPolicy,
        hotelId,
      ]
    );
    console.log(`  Updated: ${hotel.name}`);
  } else {
    const inserted = await client.query(
      `INSERT INTO hotels (
        organization_id, name, city, address, distance_m, markaziya_status,
        category, amenities, staff_notes, cancellation_policy, pricing_model,
        meal_plan_bb_premium_sar
      ) VALUES ($1,$2,'Madinah',$3,$4,$5,$6,$7,$8,$9,'BOTH',50) RETURNING id`,
      [
        orgId,
        hotel.name,
        hotel.address,
        hotel.distance_m,
        hotel.markaziya,
        hotel.category,
        hotel.amenities,
        hotel.staffNotes,
        hotel.cancellationPolicy,
      ]
    );
    hotelId = inserted.rows[0].id;
    console.log(`  Inserted: ${hotel.name}`);
  }

  for (const [type, price, occ] of roomRates(hotel.bedRate)) {
    await client.query(
      `INSERT INTO hotel_rooms (hotel_id, room_type, base_price_sar, max_occupancy)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (hotel_id, room_type) DO UPDATE SET
         base_price_sar = EXCLUDED.base_price_sar,
         max_occupancy = EXCLUDED.max_occupancy,
         updated_at = NOW()`,
      [hotelId, type, price, occ]
    );
  }

  await client.query(`DELETE FROM hotel_seasons WHERE hotel_id = $1`, [hotelId]);
  await client.query(
    `INSERT INTO hotel_seasons (hotel_id, start_date, end_date, season_multiplier)
     VALUES ($1, $2, $3, 1.0)`,
    [hotelId, hotel.seasonStart, hotel.seasonEnd]
  );

  const comm = await client.query(
    `SELECT id FROM hotel_commissions WHERE hotel_id = $1 LIMIT 1`,
    [hotelId]
  );
  if (!comm.rows[0]) {
    await client.query(
      `INSERT INTO hotel_commissions (hotel_id, commission_rate_percent) VALUES ($1, 0)`,
      [hotelId]
    );
  }
}

async function main() {
  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));
  const client = await pool.connect();

  try {
    const staff = await client.query(
      `SELECT organization_id FROM users WHERE email = 'staff@umrah.com' AND deleted_at IS NULL`
    );
    if (!staff.rows[0]) throw new Error("staff@umrah.com not found — run node scripts/insert-users.js");

    const orgId = staff.rows[0].organization_id;
    console.log(`Seeding 7 Madinah hotels for org ${orgId}...\n`);

    await client.query("BEGIN");
    for (const hotel of MADINAH_HOTELS) {
      await upsertHotel(client, orgId, hotel);
    }
    await client.query("COMMIT");

    const count = await client.query(
      `SELECT COUNT(*) FROM hotels WHERE city = 'Madinah' AND organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );
    console.log(`\n✅ Done. Madinah hotels in org: ${count.rows[0].count}`);
    console.log("Sample rates: KINAN Quad = 120 SAR, ROU TAIBA Quad = 252 SAR");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
