import { integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./core";

export const alphaTesterActivity = pgTable("alpha_tester_activity", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  sessionCount: integer("session_count").notNull().default(1),
  heartbeatCount: integer("heartbeat_count").notNull().default(0),
  lastPath: varchar("last_path", { length: 240 }),
  lastStage: varchar("last_stage", { length: 48 }),
  clientMetadata: jsonb("client_metadata").notNull().default({}),
});
