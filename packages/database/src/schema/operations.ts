import { integer, jsonb, pgTable, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
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

export const alphaInvites = pgTable("alpha_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 120 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("ACTIVE"),
  maxUses: integer("max_uses").notNull().default(1),
  uses: integer("uses").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const alphaInviteRedemptions = pgTable("alpha_invite_redemptions", {
  inviteId: uuid("invite_id").notNull().references(() => alphaInvites.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.inviteId, table.userId] })]);
