import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { artworks, users } from "./core";

export const journeyEntries = pgTable("journey_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").references(() => artworks.id, { onDelete: "set null" }),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
