import type {} from "hono";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { db, pool } from "./db/client.js";
import { demoItems } from "./db/schema.js";
import { getRuntimeMetrics, measure, recordRequest } from "./lib/timing.js";

const TimingSchema = z
  .object({
    moduleLoadedAtMs: z.number(),
    instanceAgeMs: z.number(),
    requestCountOnInstance: z.number(),
    isColdStart: z.boolean(),
    fluidCompute: z.boolean(),
    handlerMs: z.number(),
    dbPingMs: z.number().nullable(),
    dbQueryMs: z.number().nullable(),
    poolTotalCount: z.number().nullable(),
    poolIdleCount: z.number().nullable(),
    poolWaitingCount: z.number().nullable(),
  })
  .openapi("Timing");

const DemoItemSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    category: z.string(),
    score: z.number(),
    createdAt: z.string(),
  })
  .openapi("DemoItem");

const HelloResponseSchema = z
  .object({
    message: z.string(),
    planet: z.string(),
    runtime: z.string(),
    timing: TimingSchema,
  })
  .openapi("HelloResponse");

const ItemsResponseSchema = z
  .object({
    items: z.array(DemoItemSchema),
    total: z.number(),
    timing: TimingSchema,
  })
  .openapi("ItemsResponse");

const helloRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Demo"],
  summary: "Static hello payload",
  description: "Returns dummy data without touching the database. Useful as a cold-start baseline.",
  responses: {
    200: {
      description: "Hello payload with runtime timing",
      content: {
        "application/json": {
          schema: HelloResponseSchema,
        },
      },
    },
  },
});

const itemsRoute = createRoute({
  method: "get",
  path: "/items",
  tags: ["Demo"],
  summary: "List seeded demo items from PlanetScale Postgres",
  description:
    "Queries demo_items via Drizzle + pg pool (Fluid compute). Includes DB ping/query timings and pool stats.",
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().openapi({
        param: { name: "limit", in: "query" },
        example: 10,
      }),
    }),
  },
  responses: {
    200: {
      description: "Items from PlanetScale with timing metrics",
      content: {
        "application/json": {
          schema: ItemsResponseSchema,
        },
      },
    },
    500: {
      description: "Database error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
            timing: TimingSchema,
          }),
        },
      },
    },
  },
});

const app = new OpenAPIHono();

app.use("*", async (c, next) => {
  recordRequest();
  const handlerStart = performance.now();
  await next();
  c.header("x-request-count", String(getRuntimeMetrics().requestCountOnInstance));
  c.header("x-cold-start", String(getRuntimeMetrics().isColdStart));
  c.header("x-handler-ms", String(Math.round((performance.now() - handlerStart) * 100) / 100));
});

app.openapi(helloRoute, (c) => {
  const handlerStart = performance.now();

  return c.json({
    message: "Universal Fluid Compute + PlanetScale Postgres demo",
    planet: "horizon.psdb.cloud",
    runtime: "nodejs",
    timing: {
      ...getRuntimeMetrics(),
      handlerMs: Math.round((performance.now() - handlerStart) * 100) / 100,
      dbPingMs: null,
      dbQueryMs: null,
      poolTotalCount: pool.totalCount,
      poolIdleCount: pool.idleCount,
      poolWaitingCount: pool.waitingCount,
    },
  });
});

app.openapi(itemsRoute, async (c) => {
  const handlerStart = performance.now();
  const limit = c.req.valid("query").limit ?? 10;

  const buildTiming = (dbPingMs: number | null, dbQueryMs: number | null) => ({
    ...getRuntimeMetrics(),
    handlerMs: Math.round((performance.now() - handlerStart) * 100) / 100,
    dbPingMs,
    dbQueryMs,
    poolTotalCount: pool.totalCount,
    poolIdleCount: pool.idleCount,
    poolWaitingCount: pool.waitingCount,
  });

  try {
    const { durationMs: dbPingMs } = await measure(() => db.execute(sql`select 1 as ok`));
    const { result: rows, durationMs: dbQueryMs } = await measure(() =>
      db.select().from(demoItems).orderBy(demoItems.score).limit(limit),
    );

    return c.json(
      {
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          score: row.score,
          createdAt: row.createdAt.toISOString(),
        })),
        total: rows.length,
        timing: buildTiming(dbPingMs, dbQueryMs),
      },
      200,
    );
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Unknown database error",
        timing: buildTiming(null, null),
      },
      500,
    );
  }
});

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "PlanetScale Fluid Compute Demo",
    version: "0.1.0",
    description:
      "Hono + OpenAPI + Drizzle on Vercel Fluid compute with PlanetScale Postgres connection pooling.",
  },
});

app.get("/openapi.json", (c) =>
  c.json(
    app.getOpenAPIDocument({
      openapi: "3.0.0",
      info: {
        title: "PlanetScale Fluid Compute Demo",
        version: "0.1.0",
      },
    }),
  ),
);

export default app;
