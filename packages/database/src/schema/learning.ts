import { integer, jsonb, pgTable, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./core";

export const lessonProgress = pgTable("lesson_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonKey: varchar("lesson_key", { length: 180 }).notNull(),
  lessonVersion: integer("lesson_version").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("STARTED"),
  reflection: jsonb("reflection").notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.lessonKey] })]);

export const cycleProgress = pgTable("cycle_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cycleKey: varchar("cycle_key", { length: 140 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  completedLessons: integer("completed_lessons").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.cycleKey] })]);
