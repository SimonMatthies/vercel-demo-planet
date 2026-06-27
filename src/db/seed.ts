import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { reset, seed } from "drizzle-seed";
import { Pool } from "pg";
import * as schema from "./schema.js";

const ROW_COUNT = 10_000;

const categories = [
  "hardware",
  "network",
  "storage",
  "messaging",
  "compute",
  "analytics",
  "security",
  "observability",
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: true } : undefined,
});

const db = drizzle({ client: pool, schema });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env and fill in PlanetScale credentials.");
  }

  const startedAt = performance.now();
  console.log(`Resetting tables...`);
  await reset(db, schema);

  console.log(`Seeding ${ROW_COUNT} demo_items rows with drizzle-seed...`);
  await seed(db, schema, { count: ROW_COUNT, seed: 42 }).refine((f) => ({
    demoItems: {
      count: ROW_COUNT,
      columns: {
        name: f.string({ isUnique: true }),
        category: f.valuesFromArray({ values: categories }),
        score: f.int({ minValue: 50, maxValue: 99 }),
      },
    },
  }));

  const elapsedMs = Math.round(performance.now() - startedAt);
  console.log(`Done in ${elapsedMs}ms.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
