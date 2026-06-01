/**
 * Seed 12 verified Makkah hotels with per-bed-derived full room rates.
 * Run: node scripts/seed-makkah-hotels.js
 */
const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

/** @typedef {[string, number, number]} RoomRow — [roomType, fullRoomRateSar, maxOccupancy] */

/**
 * @param {RoomRow[]} rooms
 */
function enabledTypes(rooms) {
  return rooms.map(([type]) => type);
}

const MAKKAH_HOTELS = [
  {
    name: "AJWA ZIAFA",
    category: "2-STAR",
    distanceLabel: "SHUTTLE SERVICE (nearby)",
    distance_m: null,
    address: "AZIZIA",
    pricingModel: "SHARING",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Shuttle"],
    staffNotes: "Budget Azizia — shuttle to Haram",
    rooms: [
      ["Single", 13, 1],
      ["Double", 50, 2],
      ["Triple", 54, 3],
      ["Quad", 60, 4],
      ["Quint", 65, 5],
    ],
  },
  {
    name: "QILA AJYAD",
    category: "2-STAR",
    distanceLabel: "1000 M, complimentary shuttle",
    distance_m: 1000,
    address: "MAIN AJYAD ROAD",
    pricingModel: "SHARING",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Shuttle"],
    staffNotes: "Main Ajyad Road — comp shuttle included",
    rooms: [
      ["Single", 17, 1],
      ["Double", 70, 2],
      ["Triple", 75, 3],
      ["Quad", 80, 4],
      ["Quint", 85, 5],
    ],
  },
  {
    name: "DYAR MATAR",
    category: "ECONOMY",
    distanceLabel: "1200 M",
    distance_m: 1200,
    address: "IBRAHIM KHALIL ROAD, MISFILLAH",
    pricingModel: "SHARING",
    seasonStart: "2026-06-21",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con"],
    staffNotes: "Economy Misfillah option",
    rooms: [
      ["Single", 19, 1],
      ["Double", 80, 2],
      ["Triple", 84, 3],
      ["Quad", 92, 4],
      ["Quint", 95, 5],
    ],
  },
  {
    name: "JADA KHALIL",
    category: "1-STAR",
    distanceLabel: "1200 M",
    distance_m: 1200,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    pricingModel: "SHARING",
    seasonStart: "2026-06-16",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con"],
    staffNotes: "Early season start (16-Jun)",
    rooms: [
      ["Single", 21, 1],
      ["Double", 90, 2],
      ["Triple", 96, 3],
      ["Quad", 100, 4],
      ["Quint", 105, 5],
    ],
  },
  {
    name: "KISWAH TOWER",
    category: "4-STAR",
    distanceLabel: "SHUTTLE SERVICE",
    distance_m: null,
    address: "TEHSEER STREET",
    pricingModel: "ROOM",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Shuttle", "Restaurant"],
    staffNotes: "4-star room basis — shuttle service, no single rooms",
    rooms: [
      ["Double", 53, 2],
      ["Triple", 111, 3],
      ["Quad", 116, 4],
      ["Quint", 120, 5],
    ],
  },
  {
    name: "MULTIQA IBADAT & TARA JAWRAT",
    category: "1-STAR",
    distanceLabel: "750-800 M",
    distance_m: 775,
    address: "HIJRA ROAD, MISFILLAH",
    pricingModel: "SHARING",
    seasonStart: "2026-06-08",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con"],
    staffNotes: "Earliest season start (08-Jun) — good value Hijra Road",
    rooms: [
      ["Single", 24, 1],
      ["Double", 106, 2],
      ["Triple", 111, 3],
      ["Quad", 116, 4],
      ["Quint", 120, 5],
    ],
  },
  {
    name: "SAIF AL MAJD",
    category: "3-STAR",
    distanceLabel: "600-650 M",
    distance_m: 625,
    address: "HIJRA ROAD, MISFILLAH",
    pricingModel: "SHARING",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Breakfast"],
    staffNotes: "3-star sharing on Hijra Road",
    rooms: [
      ["Single", 31, 1],
      ["Double", 140, 2],
      ["Triple", 144, 3],
      ["Quad", 152, 4],
      ["Quint", 155, 5],
    ],
  },
  {
    name: "JAFRIA (MASAR AL AEZ 2)",
    category: "Building",
    distanceLabel: "550-600 M",
    distance_m: 575,
    address: "HIJRA ROAD, MISFILLAH",
    pricingModel: "SHARING",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con"],
    staffNotes: "Building-style accommodation, Hijra Road",
    rooms: [
      ["Single", 31, 1],
      ["Double", 140, 2],
      ["Triple", 144, 3],
      ["Quad", 152, 4],
      ["Quint", 155, 5],
    ],
  },
  {
    name: "JAWRAT BAIT (ARAFAT ZEHBI)",
    category: "5-STAR",
    distanceLabel: "600 M",
    distance_m: 600,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    pricingModel: "SHARING",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Breakfast", "Restaurant"],
    staffNotes: "Premium 5-star sharing — Ibrahim Khalil Road",
    rooms: [
      ["Single", 38, 1],
      ["Double", 160, 2],
      ["Triple", 165, 3],
      ["Quad", 172, 4],
      ["Quint", 190, 5],
    ],
  },
  {
    name: "BADAR MASA",
    category: "3-STAR",
    distanceLabel: "600 M",
    distance_m: 600,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    pricingModel: "ROOM",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Breakfast"],
    staffNotes: "Room basis — full room rates, no single rooms",
    rooms: [
      ["Double", 270, 2],
      ["Triple", 276, 3],
      ["Quad", 280, 4],
      ["Quint", 285, 5],
    ],
  },
  {
    name: "SWISS KHALIL / BLORA MOAZAN",
    category: "3-STAR",
    distanceLabel: "350-400 M (very close)",
    distance_m: 375,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    pricingModel: "SHARING",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Breakfast"],
    staffNotes: "Very close to Haram — no quint rooms",
    rooms: [
      ["Single", 49, 1],
      ["Double", 186, 2],
      ["Triple", 189, 3],
      ["Quad", 196, 4],
    ],
  },
  {
    name: "EMAR ANDULUSIA",
    category: "3-STAR",
    distanceLabel: "300 M (very close)",
    distance_m: 300,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    pricingModel: "ROOM",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    amenities: ["WiFi", "Air-Con", "Breakfast", "Restaurant"],
    staffNotes: "Closest room-basis option — double/triple/quad only",
    rooms: [
      ["Double", 260, 2],
      ["Triple", 264, 3],
      ["Quad", 272, 4],
    ],
  },
];

async function upsertHotel(client, orgId, hotel) {
  const existing = await client.query(
    `SELECT id FROM hotels WHERE name = $1 AND city = 'Makkah' AND deleted_at IS NULL`,
    [hotel.name]
  );

  const types = enabledTypes(hotel.rooms);
  let hotelId;

  if (existing.rows[0]) {
    hotelId = existing.rows[0].id;
    await client.query(
      `UPDATE hotels SET
        organization_id = $1, address = $2, distance_m = $3, category = $4,
        amenities = $5, staff_notes = $6, pricing_model = $7,
        enabled_room_types = $8, updated_at = NOW()
       WHERE id = $9`,
      [
        orgId,
        hotel.address,
        hotel.distance_m,
        hotel.category,
        hotel.amenities,
        `${hotel.distanceLabel}. ${hotel.staffNotes}`,
        hotel.pricingModel,
        types,
        hotelId,
      ]
    );
    console.log(`  Updated: ${hotel.name}`);
  } else {
    const inserted = await client.query(
      `INSERT INTO hotels (
        organization_id, name, city, address, distance_m, category,
        amenities, staff_notes, pricing_model, enabled_room_types,
        meal_plan_bb_premium_sar
      ) VALUES ($1,$2,'Makkah',$3,$4,$5,$6,$7,$8,$9,50) RETURNING id`,
      [
        orgId,
        hotel.name,
        hotel.address,
        hotel.distance_m,
        hotel.category,
        hotel.amenities,
        `${hotel.distanceLabel}. ${hotel.staffNotes}`,
        hotel.pricingModel,
        types,
      ]
    );
    hotelId = inserted.rows[0].id;
    console.log(`  Inserted: ${hotel.name}`);
  }

  for (const [type, price, occ] of hotel.rooms) {
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

  // Remove room types no longer offered (e.g. Quint removed)
  await client.query(
    `DELETE FROM hotel_rooms
     WHERE hotel_id = $1 AND room_type <> ALL($2::text[])`,
    [hotelId, types]
  );

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
    console.log(`Seeding 12 Makkah hotels for org ${orgId}...\n`);

    await client.query("BEGIN");
    for (const hotel of MAKKAH_HOTELS) {
      await upsertHotel(client, orgId, hotel);
    }
    await client.query("COMMIT");

    const count = await client.query(
      `SELECT COUNT(*) FROM hotels WHERE city = 'Makkah' AND organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );
    console.log(`\n✅ Done. Makkah hotels in org: ${count.rows[0].count}`);
    console.log("Verified: AJWA Quad=60 SAR, EMAR ANDULUSIA Quad=272 SAR, KISWAH Quad=116 SAR");
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
