import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { outboxEvents } from "../schema/core";

export type AlphaFeedbackCategory = "LEARNING" | "USABILITY" | "BUG" | "CONTENT" | "OTHER";

export interface SubmitAlphaFeedbackInput {
  userId: string;
  category: AlphaFeedbackCategory;
  rating: number;
  message: string;
  path?: string | null;
}

export interface AlphaFeedbackRecord {
  id: string;
  category: AlphaFeedbackCategory;
  rating: number;
  message: string;
  path: string | null;
  createdAt: Date;
}

function parsePayload(payload: unknown): Omit<AlphaFeedbackRecord, "id" | "createdAt"> | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (typeof data.category !== "string" || typeof data.rating !== "number" || typeof data.message !== "string") return null;
  return {
    category: data.category as AlphaFeedbackCategory,
    rating: data.rating,
    message: data.message,
    path: typeof data.path === "string" ? data.path : null,
  };
}

export class DrizzleClosedAlphaFeedbackRepository {
  constructor(private readonly db: Database) {}

  async submit(input: SubmitAlphaFeedbackInput): Promise<string> {
    const [row] = await this.db.insert(outboxEvents).values({
      eventType: "alpha.feedback.submitted.v1",
      aggregateType: "USER",
      aggregateId: input.userId,
      payload: {
        category: input.category,
        rating: input.rating,
        message: input.message,
        path: input.path ?? null,
      },
    }).returning({ id: outboxEvents.id });

    if (!row) throw new Error("FEEDBACK_PERSIST_FAILED");
    return row.id;
  }

  async listRecent(userId: string, limit = 10): Promise<AlphaFeedbackRecord[]> {
    const rows = await this.db.select({
      id: outboxEvents.id,
      payload: outboxEvents.payload,
      createdAt: outboxEvents.createdAt,
    }).from(outboxEvents)
      .where(and(
        eq(outboxEvents.eventType, "alpha.feedback.submitted.v1"),
        eq(outboxEvents.aggregateId, userId),
      ))
      .orderBy(desc(outboxEvents.createdAt))
      .limit(Math.max(1, Math.min(limit, 25)));

    return rows.flatMap((row) => {
      const parsed = parsePayload(row.payload);
      return parsed ? [{ id: row.id, createdAt: row.createdAt, ...parsed }] : [];
    });
  }
}
