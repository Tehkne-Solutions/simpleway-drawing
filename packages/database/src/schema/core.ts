import { bigint, integer, jsonb, numeric, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  ...timestamps,
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 120 }),
  bio: text("bio"),
  preferredPath: varchar("preferred_path", { length: 64 }),
  ...timestamps,
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programKey: text("program_key").notNull(),
  programVersion: integer("program_version").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  ...timestamps,
});

export const fileAssets = pgTable("file_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull().unique(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),
  width: integer("width"),
  height: integer("height"),
  contentHash: varchar("content_hash", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull().default("READY"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artworks = pgTable("artworks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  visibility: varchar("visibility", { length: 32 }).notNull().default("PRIVATE"),
  title: varchar("title", { length: 200 }),
  currentVersionId: uuid("current_version_id"),
  ...timestamps,
});

export const artworkVersions = pgTable("artwork_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  fileAssetId: uuid("file_asset_id").notNull().references(() => fileAssets.id, { onDelete: "restrict" }),
  source: varchar("source", { length: 32 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("artwork_version_unique").on(table.artworkId, table.versionNumber)]);

export const exerciseAttempts = pgTable("exercise_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseKey: text("exercise_key").notNull(),
  exerciseVersion: integer("exercise_version").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("STARTED"),
  assistanceLevel: smallint("assistance_level").notNull().default(0),
  difficultySnapshot: jsonb("difficulty_snapshot").notNull().default({}),
  artworkId: uuid("artwork_id").references(() => artworks.id, { onDelete: "set null" }),
  retryOfAttemptId: uuid("retry_of_attempt_id"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export const skillEvidence = pgTable("skill_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillKey: text("skill_key").notNull(),
  evidenceType: varchar("evidence_type", { length: 48 }).notNull(),
  dimension: varchar("dimension", { length: 64 }),
  value: numeric("value", { precision: 7, scale: 4 }).notNull(),
  confidence: numeric("confidence", { precision: 7, scale: 4 }).notNull(),
  assistanceLevel: smallint("assistance_level").notNull(),
  difficulty: jsonb("difficulty").notNull().default({}),
  context: varchar("context", { length: 64 }),
  sourceType: varchar("source_type", { length: 64 }).notNull(),
  sourceId: text("source_id").notNull(),
  evaluatorType: varchar("evaluator_type", { length: 64 }).notNull(),
  evaluatorVersion: varchar("evaluator_version", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learnerSkillStates = pgTable("learner_skill_states", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillKey: text("skill_key").notNull(),
  masteryScore: numeric("mastery_score", { precision: 7, scale: 4 }).notNull(),
  masteryLevel: varchar("mastery_level", { length: 32 }).notNull(),
  confidence: numeric("confidence", { precision: 7, scale: 4 }).notNull(),
  depth: numeric("depth", { precision: 7, scale: 4 }).notNull(),
  breadth: numeric("breadth", { precision: 7, scale: 4 }).notNull(),
  evidenceCount: integer("evidence_count").notNull().default(0),
  lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  masteryAlgorithmVersion: varchar("mastery_algorithm_version", { length: 64 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.skillKey] })]);

export const outboxEvents = pgTable("system_outbox_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: varchar("event_type", { length: 160 }).notNull(),
  aggregateType: varchar("aggregate_type", { length: 64 }).notNull(),
  aggregateId: text("aggregate_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
});
