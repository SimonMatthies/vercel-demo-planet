import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const demoItems = pgTable("demo_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DemoItem = typeof demoItems.$inferSelect;
export type NewDemoItem = typeof demoItems.$inferInsert;
