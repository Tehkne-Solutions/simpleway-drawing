import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, outboxEvents } from "../schema/core";
import { cycleProgress, lessonProgress } from "../schema/learning";
import { journeyEntries } from "../schema/journey";

export const C0_CYCLE_KEY = "cycle.swd.c0";
export const C0_LESSON_KEYS = [
  "lesson.swd.c0.what_drawing_is",
  "lesson.swd.c0.hnk_loop",
  "lesson.swd.c0.drawing_zero",
  "lesson.swd.c0.intentional_marks",
  "lesson.swd.c0.seeing_before_naming",
  "lesson.swd.c0.simple_construction",
  "lesson.swd.c0.first_correction",
] as const;

export class DrizzleLearningProgressRepository {
  constructor(private readonly db: Database) {}

  async getCompletedLessonKeys(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ lessonKey: lessonProgress.lessonKey })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "COMPLETED")));
    return rows.map((row) => row.lessonKey);
  }

  async hasDrawingZero(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: exerciseAttempts.id })
      .from(exerciseAttempts)
      .where(and(
        eq(exerciseAttempts.userId, userId),
        eq(exerciseAttempts.exerciseKey, "exercise.swd.c0.drawing_zero"),
        eq(exerciseAttempts.status, "SUBMITTED"),
      ))
      .limit(1);
    return Boolean(row);
  }

  async completeLesson(input: {
    userId: string;
    lessonKey: string;
    lessonVersion: number;
    reflection?: Record<string, unknown>;
  }): Promise<{ cycleCompleted: boolean; completedLessons: number }> {
    return this.db.transaction(async (tx) => {
      if (input.lessonKey === "lesson.swd.c0.drawing_zero") {
        const [baseline] = await tx
          .select({ id: exerciseAttempts.id })
          .from(exerciseAttempts)
          .where(and(
            eq(exerciseAttempts.userId, input.userId),
            eq(exerciseAttempts.exerciseKey, "exercise.swd.c0.drawing_zero"),
            eq(exerciseAttempts.status, "SUBMITTED"),
          ))
          .limit(1);
        if (!baseline) throw new Error("DRAWING_ZERO_REQUIRED");
      }

      const [previousCycle] = await tx
        .select({ status: cycleProgress.status })
        .from(cycleProgress)
        .where(and(eq(cycleProgress.userId, input.userId), eq(cycleProgress.cycleKey, C0_CYCLE_KEY)))
        .limit(1);

      const now = new Date();
      await tx
        .insert(lessonProgress)
        .values({
          userId: input.userId,
          lessonKey: input.lessonKey,
          lessonVersion: input.lessonVersion,
          status: "COMPLETED",
          reflection: input.reflection ?? {},
          completedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonKey],
          set: {
            lessonVersion: input.lessonVersion,
            status: "COMPLETED",
            reflection: input.reflection ?? {},
            completedAt: now,
            updatedAt: now,
          },
        });

      const completedRows = await tx
        .select({ lessonKey: lessonProgress.lessonKey })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, input.userId), eq(lessonProgress.status, "COMPLETED")));
      const c0Completed = new Set(completedRows.map((row) => row.lessonKey));
      const completedLessons = C0_LESSON_KEYS.filter((key) => c0Completed.has(key)).length;
      const cycleCompleted = completedLessons === C0_LESSON_KEYS.length;
      const newlyCompleted = cycleCompleted && previousCycle?.status !== "COMPLETED";

      await tx
        .insert(cycleProgress)
        .values({
          userId: input.userId,
          cycleKey: C0_CYCLE_KEY,
          status: cycleCompleted ? "COMPLETED" : "ACTIVE",
          completedLessons,
          completedAt: cycleCompleted ? now : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [cycleProgress.userId, cycleProgress.cycleKey],
          set: {
            status: cycleCompleted ? "COMPLETED" : "ACTIVE",
            completedLessons,
            completedAt: cycleCompleted ? now : null,
            updatedAt: now,
          },
        });

      if (newlyCompleted) {
        await tx.insert(journeyEntries).values({
          userId: input.userId,
          type: "CYCLE_COMPLETED",
          title: "C0 · I Can Draw concluído",
          metadata: {
            cycleKey: C0_CYCLE_KEY,
            transformation: "Eu consigo observar, tentar, comparar e corrigir.",
          },
          occurredAt: now,
        });
      }

      await tx.insert(outboxEvents).values({
        eventType: newlyCompleted ? "learning.cycle.completed.v1" : "learning.lesson.completed.v1",
        aggregateType: newlyCompleted ? "cycle_progress" : "lesson_progress",
        aggregateId: `${input.userId}:${newlyCompleted ? C0_CYCLE_KEY : input.lessonKey}`,
        payload: {
          userId: input.userId,
          lessonKey: input.lessonKey,
          lessonVersion: input.lessonVersion,
          cycleKey: C0_CYCLE_KEY,
          completedLessons,
          cycleCompleted,
        },
      });

      return { cycleCompleted, completedLessons };
    });
  }
}
