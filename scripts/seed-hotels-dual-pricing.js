/**
 * Seed all 19 hotels with SHARING + PRIVATE dual pricing (verified data).
 * Run: node scripts/seed-hotels-dual-pricing.js
 */
const { Pool } = require("pg");
const { loadEnvFiles, getPoolConfig } = require("./load-env");

loadEnvFiles();

/** @typedef {{ name: string, category: string, distanceLabel: string, distance_m: number|null, address: string, markaziya?: string, seasonStart: string, seasonEnd: string, sharingRate: number|null, offersSharing: boolean, offersPrivate: boolean, privateRooms: [string, number][] }} HotelDef */

/**
 * @param {import('pg').PoolClient} client
 * @param {string} orgId
 * @param {HotelDef} hotel
 */
async function upsertHotel(client, orgId, hotel) {
  const enabledTypes = hotel.privateRooms.map(([t]) => t);
  const pricingModel =
    hotel.offersSharing && hotel.offersPrivate
      ? "BOTH"
      : hotel.offersSharing
        ? "SHARING"
        : "ROOM";

  const existing = await client.query(
    `SELECT id FROM hotels WHERE name = $1 AND city = $2 AND deleted_at IS NULL`,
    [hotel.name, hotel.city]
  );

  let hotelId;
  const markaziya = hotel.markaziya || null;

  if (existing.rows[0]) {
    hotelId = existing.rows[0].id;
    await client.query(
      `UPDATE hotels SET
        organization_id = $1, address = $2, distance_label = $3, distance_m = $4,
        category = $5, markaziya_status = $6, pricing_model = $7,
        sharing_rate_per_bed = $8, offers_sharing = $9, offers_private = $10,
        enabled_room_types = $11, staff_notes = $12, updated_at = NOW()
       WHERE id = $13`,
      [
        orgId,
        hotel.address,
        hotel.distanceLabel,
        hotel.distance_m,
        hotel.category,
        markaziya,
        pricingModel,
        hotel.sharingRate,
        hotel.offersSharing,
        hotel.offersPrivate,
        enabledTypes,
        hotel.staffNotes || null,
        hotelId,
      ]
    );
    console.log(`  Updated: ${hotel.name} (${hotel.city})`);
  } else {
    const ins = await client.query(
      `INSERT INTO hotels (
        organization_id, name, city, category, address, distance_label, distance_m,
        markaziya_status, pricing_model, sharing_rate_per_bed, offers_sharing, offers_private,
        enabled_room_types, meal_plan_bb_premium_sar
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,50) RETURNING id`,
      [
        orgId,
        hotel.name,
        hotel.city,
        hotel.category,
        hotel.address,
        hotel.distanceLabel,
        hotel.distance_m,
        markaziya,
        pricingModel,
        hotel.sharingRate,
        hotel.offersSharing,
        hotel.offersPrivate,
        enabledTypes,
      ]
    );
    hotelId = ins.rows[0].id;
    await client.query(
      `INSERT INTO hotel_commissions (hotel_id, commission_rate_percent) VALUES ($1, 0)`,
      [hotelId]
    );
    console.log(`  Inserted: ${hotel.name} (${hotel.city})`);
  }

  await client.query(`DELETE FROM hotel_rooms WHERE hotel_id = $1`, [hotelId]);
  const occ = { Single: 1, Double: 2, Triple: 3, Quad: 4, Quint: 5 };
  for (const [type, rate] of hotel.privateRooms) {
    await client.query(
      `INSERT INTO hotel_rooms (hotel_id, room_type, base_price_sar, max_occupancy)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (hotel_id, room_type) DO UPDATE SET
         base_price_sar = EXCLUDED.base_price_sar, updated_at = NOW()`,
      [hotelId, type, rate, occ[type] || 1]
    );
  }

  await client.query(`DELETE FROM hotel_seasons WHERE hotel_id = $1`, [hotelId]);
  await client.query(
    `INSERT INTO hotel_seasons (hotel_id, start_date, end_date, season_multiplier)
     VALUES ($1, $2, $3, 1.0)`,
    [hotelId, hotel.seasonStart, hotel.seasonEnd]
  );
}

function parseDistanceM(label) {
  const range = label.match(/(\d+)\s*[-–]\s*(\d+)\s*M/i);
  if (range) return Math.round((+range[1] + +range[2]) / 2);
  const single = label.match(/(\d+)\s*M/i);
  if (single) return +single[1];
  return null;
}

const HOTELS = [
  // —— MAKKAH (12) ——
  {
    name: "AJWA ZIAFA",
    city: "Makkah",
    category: "2-STAR",
    distanceLabel: "SHUTTLE SERVICE",
    distance_m: null,
    address: "AZIZIA",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 13,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 26],
      ["Double", 26],
      ["Triple", 54],
      ["Quad", 60],
    ],
  },
  {
    name: "QILA AJYAD",
    city: "Makkah",
    category: "2-STAR",
    distanceLabel: "1000 M, COOP SHUTTLE",
    distance_m: 1000,
    address: "MAIN AJYAD ROAD",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 17,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 34],
      ["Double", 34],
      ["Triple", 75],
      ["Quad", 80],
    ],
  },
  {
    name: "DYAR MATAR",
    city: "Makkah",
    category: "ECONOMY",
    distanceLabel: "1200 M",
    distance_m: 1200,
    address: "IBRAHIM KHALIL ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-21",
    seasonEnd: "2026-08-26",
    sharingRate: 19,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 38],
      ["Double", 38],
      ["Triple", 84],
      ["Quad", 92],
    ],
  },
  {
    name: "JADA KHALIL",
    city: "Makkah",
    category: "1-STAR",
    distanceLabel: "1200 M",
    distance_m: 1200,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-16",
    seasonEnd: "2026-08-26",
    sharingRate: 21,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 42],
      ["Double", 42],
      ["Triple", 96],
      ["Quad", 100],
    ],
  },
  {
    name: "KISWAH TOWER",
    city: "Makkah",
    category: "4-STAR",
    distanceLabel: "SHUTTLE SERVICE",
    distance_m: null,
    address: "TEHSEER STREET",
    markaziya: "OUTSIDE",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    sharingRate: null,
    offersSharing: false,
    offersPrivate: true,
    privateRooms: [
      ["Single", 48],
      ["Double", 48],
      ["Triple", 111],
      ["Quad", 116],
    ],
  },
  {
    name: "MULTIQA IBADAT & TARA JAWRAT",
    city: "Makkah",
    category: "1-STAR",
    distanceLabel: "750-800 M",
    distance_m: 775,
    address: "HIJRA ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-08",
    seasonEnd: "2026-08-26",
    sharingRate: 24,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 48],
      ["Double", 48],
      ["Triple", 111],
      ["Quad", 116],
    ],
  },
  {
    name: "SAIF AL MAJD",
    city: "Makkah",
    category: "3-STAR",
    distanceLabel: "600-650 M",
    distance_m: 625,
    address: "HIJRA ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    sharingRate: 31,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 62],
      ["Double", 62],
      ["Triple", 144],
      ["Quad", 152],
    ],
  },
  {
    name: "JAFRIA (MASAR AL AEZ 2)",
    city: "Makkah",
    category: "BUILDING",
    distanceLabel: "550-600 M",
    distance_m: 575,
    address: "HIJRA ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 31,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 62],
      ["Double", 62],
      ["Triple", 144],
      ["Quad", 152],
    ],
  },
  {
    name: "JAWRAT BAIT (ARAFAT ZEHBI)",
    city: "Makkah",
    category: "5-STAR",
    distanceLabel: "600 M",
    distance_m: 600,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 38,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 76],
      ["Double", 76],
      ["Triple", 165],
      ["Quad", 172],
    ],
  },
  {
    name: "BADAR MASA",
    city: "Makkah",
    category: "3-STAR",
    distanceLabel: "600 M",
    distance_m: 600,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    sharingRate: null,
    offersSharing: false,
    offersPrivate: true,
    privateRooms: [
      ["Single", 114],
      ["Double", 114],
      ["Triple", 276],
      ["Quad", 280],
    ],
  },
  {
    name: "SWISS KHALIL / BLORA MOAZAN",
    city: "Makkah",
    category: "3-STAR",
    distanceLabel: "350-400 M",
    distance_m: 375,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    sharingRate: 49,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 98],
      ["Double", 98],
      ["Triple", 189],
      ["Quad", 196],
    ],
  },
  {
    name: "EMAR ANDULUSIA",
    city: "Makkah",
    category: "3-STAR",
    distanceLabel: "300 M",
    distance_m: 300,
    address: "MAIN IBRAHIM KHALIL ROAD, MISFILLAH",
    markaziya: "OUTSIDE",
    seasonStart: "2026-07-01",
    seasonEnd: "2026-08-26",
    sharingRate: null,
    offersSharing: false,
    offersPrivate: true,
    privateRooms: [
      ["Single", 136],
      ["Double", 136],
      ["Triple", 264],
      ["Quad", 272],
    ],
  },
  // —— MADINAH (7) ——
  {
    name: "KINAN MADINA",
    city: "Madinah",
    category: "ECONOMY_PLUS",
    distanceLabel: "900 M",
    distance_m: 900,
    address: "MAIN QURBAN ROAD, BILAL MASJID",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 25,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 50],
      ["Double", 50],
      ["Triple", 114],
      ["Quad", 120],
    ],
  },
  {
    name: "DAR AIJYAL 1",
    city: "Madinah",
    category: "ECONOMY_PLUS",
    distanceLabel: "750 M",
    distance_m: 750,
    address: "SHUMALIA LADIES GATE SIDE",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 29,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 58],
      ["Double", 58],
      ["Triple", 135],
      ["Quad", 140],
    ],
  },
  {
    name: "ABDULLAH FOUZAN (DYAR HIJAZ)",
    city: "Madinah",
    category: "ECONOMY_PLUS",
    distanceLabel: "600 M",
    distance_m: 600,
    address: "MAIN QURBAN ROAD, BILAL MASJID SIDE",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 35,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 70],
      ["Double", 70],
      ["Triple", 165],
      ["Quad", 172],
    ],
  },
  {
    name: "KARAM GOLDEN",
    city: "Madinah",
    category: "5-STAR",
    distanceLabel: "550 M",
    distance_m: 550,
    address: "MAIN QURBAN ROAD, BILAL MASJID SIDE",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-15",
    seasonEnd: "2026-08-26",
    sharingRate: 37,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 74],
      ["Double", 74],
      ["Triple", 174],
      ["Quad", 180],
    ],
  },
  {
    name: "ANSAR PLUS",
    city: "Madinah",
    category: "ECONOMY_PLUS",
    distanceLabel: "500 M",
    distance_m: 500,
    address: "MAIN QURBAN ROAD, BILAL MASJID SIDE",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 38,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 76],
      ["Double", 76],
      ["Triple", 180],
      ["Quad", 184],
    ],
  },
  {
    name: "WIDYAR AL MADINA / ROU KHAIR",
    city: "Madinah",
    category: "5-STAR",
    distanceLabel: "350 M",
    distance_m: 350,
    address: "BAB SALAM SIDE AFTER MARKAZIYA FIRST ROW",
    markaziya: "OUTSIDE",
    seasonStart: "2026-06-26",
    seasonEnd: "2026-08-26",
    sharingRate: 40,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 80],
      ["Double", 80],
      ["Triple", 189],
      ["Quad", 196],
    ],
  },
  {
    name: "ROU TAIBA",
    city: "Madinah",
    category: "5-STAR",
    distanceLabel: "100 M (INSIDE MARKAZIYA)",
    distance_m: 100,
    address: "BEHIND MASJID GHAMAMA",
    markaziya: "INSIDE",
    seasonStart: "2026-06-30",
    seasonEnd: "2026-08-26",
    staffNotes: "Premium — inside markaziya, closest to Masjid",
    sharingRate: 55,
    offersSharing: true,
    offersPrivate: true,
    privateRooms: [
      ["Single", 110],
      ["Double", 110],
      ["Triple", 246],
      ["Quad", 252],
    ],
  },
].map((h) => ({
  ...h,
  distance_m: h.distance_m ?? parseDistanceM(h.distanceLabel),
}));

async function main() {
  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));
  const client = await pool.connect();
  try {
    const staff = await client.query(
      `SELECT organization_id FROM users WHERE email = 'staff@umrah.com' AND deleted_at IS NULL`
    );
    if (!staff.rows[0]) throw new Error("staff@umrah.com not found");
    const orgId = staff.rows[0].organization_id;

    console.log(`Seeding ${HOTELS.length} hotels (dual pricing)...\n`);
    await client.query("BEGIN");
    for (const hotel of HOTELS) {
      await upsertHotel(client, orgId, hotel);
    }
    await client.query("COMMIT");

    const counts = await client.query(
      `SELECT city, COUNT(*) FROM hotels WHERE organization_id = $1 AND deleted_at IS NULL GROUP BY city`,
      [orgId]
    );
    console.log("\n✅ Done.");
    counts.rows.forEach((r) => console.log(`  ${r.city}: ${r.count} hotels`));
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
