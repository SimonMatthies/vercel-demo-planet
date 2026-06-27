import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { demoItems } from "../src/db/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: true } : undefined,
});

const db = drizzle({ client: pool, schema: { demoItems } });

const seedRows = [
  { name: "Alpha sensor", category: "hardware", score: 91 },
  { name: "Beta relay", category: "network", score: 74 },
  { name: "Gamma cache", category: "storage", score: 88 },
  { name: "Delta queue", category: "messaging", score: 67 },
  { name: "Epsilon worker", category: "compute", score: 95 },
  { name: "Zeta router", category: "network", score: 82 },
  { name: "Eta ledger", category: "storage", score: 79 },
  { name: "Theta probe", category: "hardware", score: 71 },
  { name: "Iota stream", category: "messaging", score: 86 },
  { name: "Kappa shard", category: "storage", score: 93 },
  { name: "Lambda burst", category: "compute", score: 77 },
  { name: "Mu bridge", category: "network", score: 84 },
  { name: "Nu beacon", category: "hardware", score: 69 },
  { name: "Xi fanout", category: "messaging", score: 90 },
  { name: "Omicron pool", category: "compute", score: 81 },
  { name: "Pi mirror", category: "storage", score: 76 },
  { name: "Rho gateway", category: "network", score: 92 },
  { name: "Sigma pulse", category: "hardware", score: 85 },
  { name: "Tau batch", category: "compute", score: 73 },
  { name: "Upsilon trace", category: "messaging", score: 89 },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env and fill in PlanetScale credentials.");
  }

  console.log(`Seeding ${seedRows.length} demo_items rows...`);
  const inserted = await db.insert(demoItems).values(seedRows).returning();
  console.log(`Inserted ${inserted.length} rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
