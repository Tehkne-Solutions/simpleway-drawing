import { and, eq } from "drizzle-orm";
import type { Database } from "../client";
import { exerciseAttempts, outboxEvents } from "../schema/core";
import { cycleProgress, lessonProgress } from "../schema/learning";
import { journeyEntries } from "../schema/journey";

export const C0_CYCLE_KEY = "cycle.swd.c0";
export const C1_CYCLE_KEY = "cycle.swd.c1";
export const C2_CYCLE_KEY = "cycle.swd.c2";
export const C3_CYCLE_KEY = "cycle.swd.c3";
export const C4_CYCLE_KEY = "cycle.swd.c4";

export const C0_LESSON_KEYS = [
  "lesson.swd.c0.what_drawing_is", "lesson.swd.c0.hnk_loop", "lesson.swd.c0.drawing_zero", "lesson.swd.c0.intentional_marks", "lesson.swd.c0.seeing_before_naming", "lesson.swd.c0.simple_construction", "lesson.swd.c0.first_correction",
] as const;
export const C1_LESSON_KEYS = [
  "lesson.swd.c1.how_hand_moves", "lesson.swd.c1.point_to_point", "lesson.swd.c1.curve_control", "lesson.swd.c1.circle_ellipse", "lesson.swd.c1.direction_parallelism", "lesson.swd.c1.pressure_line_weight", "lesson.swd.c1.rhythm_confidence", "lesson.swd.c1.applied_line",
] as const;
export const C2_LESSON_KEYS = [
  "lesson.swd.c2.symbols_vs_observation", "lesson.swd.c2.size_proportion", "lesson.swd.c2.angle_direction", "lesson.swd.c2.position_alignment", "lesson.swd.c2.negative_space", "lesson.swd.c2.landmarks_envelope", "lesson.swd.c2.measurement", "lesson.swd.c2.visual_simplification", "lesson.swd.c2.self_check",
] as const;
export const C3_LESSON_KEYS = [
  "lesson.swd.c3.primitives", "lesson.swd.c3.decomposition", "lesson.swd.c3.envelope", "lesson.swd.c3.silhouette", "lesson.swd.c3.relationships", "lesson.swd.c3.overlap", "lesson.swd.c3.applied_construction",
] as const;
export const C4_LESSON_KEYS = [
  "lesson.swd.c4.volume_mindset", "lesson.swd.c4.boxes", "lesson.swd.c4.cylinders", "lesson.swd.c4.ellipses_space", "lesson.swd.c4.cross_contours", "lesson.swd.c4.rotation", "lesson.swd.c4.form_combination", "lesson.swd.c4.self_check",
] as const;

type CycleConfig = { cycleKey: string; lessonKeys: readonly string[]; prerequisiteCycleKey: string | null; title: string; transformation: string };
const CYCLES: CycleConfig[] = [
  { cycleKey: C0_CYCLE_KEY, lessonKeys: C0_LESSON_KEYS, prerequisiteCycleKey: null, title: "C0 · I Can Draw concluído", transformation: "Eu consigo observar, tentar, comparar e corrigir." },
  { cycleKey: C1_CYCLE_KEY, lessonKeys: C1_LESSON_KEYS, prerequisiteCycleKey: C0_CYCLE_KEY, title: "C1 · Control concluído", transformation: "Eu consigo planejar e executar um traço com mais intenção e consistência." },
  { cycleKey: C2_CYCLE_KEY, lessonKeys: C2_LESSON_KEYS, prerequisiteCycleKey: C1_CYCLE_KEY, title: "C2 · Learn to See concluído", transformation: "Eu consigo observar relações visuais antes de desenhar." },
  { cycleKey: C3_CYCLE_KEY, lessonKeys: C3_LESSON_KEYS, prerequisiteCycleKey: C2_CYCLE_KEY, title: "C3 · Shape Language concluído", transformation: "Eu consigo decompor referências em formas simples e relações estruturais antes do detalhe." },
  { cycleKey: C4_CYCLE_KEY, lessonKeys: C4_LESSON_KEYS, prerequisiteCycleKey: C3_CYCLE_KEY, title: "C4 · Form concluído", transformation: "Eu consigo construir volumes coerentes e imaginar formas girando no espaço." },
];

function cycleForLesson(lessonKey: string): CycleConfig | null {
  return CYCLES.find((cycle) => cycle.lessonKeys.includes(lessonKey)) ?? null;
}

export class DrizzleLearningProgressRepository {
  constructor(private readonly db: Database) {}

  async getCompletedLessonKeys(userId: string): Promise<string[]> {
    const rows = await this.db.select({ lessonKey: lessonProgress.lessonKey }).from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "COMPLETED")));
    return rows.map((row) => row.lessonKey);
  }

  async getCycleStatus(userId: string, cycleKey: string): Promise<"ACTIVE" | "COMPLETED" | null> {
    const [row] = await this.db.select({ status: cycleProgress.status }).from(cycleProgress).where(and(eq(cycleProgress.userId, userId), eq(cycleProgress.cycleKey, cycleKey))).limit(1);
    return row?.status === "COMPLETED" ? "COMPLETED" : row ? "ACTIVE" : null;
  }

  async hasDrawingZero(userId: string): Promise<boolean> {
    const [row] = await this.db.select({ id: exerciseAttempts.id }).from(exerciseAttempts).where(and(eq(exerciseAttempts.userId, userId), eq(exerciseAttempts.exerciseKey, "exercise.swd.c0.drawing_zero"), eq(exerciseAttempts.status, "SUBMITTED"))).limit(1);
    return Boolean(row);
  }

  async completeLesson(input: { userId: string; lessonKey: string; lessonVersion: number; reflection?: Record<string, unknown> }): Promise<{ cycleKey: string; cycleCompleted: boolean; completedLessons: number }> {
    return this.db.transaction(async (tx) => {
      const cycle = cycleForLesson(input.lessonKey);
      if (!cycle) throw new Error("LESSON_NOT_IN_FOUNDATION");
      const lessonIndex = cycle.lessonKeys.findIndex((key) => key === input.lessonKey);
      if (lessonIndex < 0) throw new Error("LESSON_NOT_IN_FOUNDATION");

      if (cycle.prerequisiteCycleKey) {
        const [prerequisite] = await tx.select({ status: cycleProgress.status }).from(cycleProgress).where(and(eq(cycleProgress.userId, input.userId), eq(cycleProgress.cycleKey, cycle.prerequisiteCycleKey))).limit(1);
        if (prerequisite?.status !== "COMPLETED") throw new Error("CYCLE_PREREQUISITE_REQUIRED");
      }

      const existingRows = await tx.select({ lessonKey: lessonProgress.lessonKey }).from(lessonProgress).where(and(eq(lessonProgress.userId, input.userId), eq(lessonProgress.status, "COMPLETED")));
      const existingCompleted = new Set(existingRows.map((row) => row.lessonKey));
      if (!existingCompleted.has(input.lessonKey)) {
        const missingPrerequisite = cycle.lessonKeys.slice(0, lessonIndex).find((key) => !existingCompleted.has(key));
        if (missingPrerequisite) throw new Error("LESSON_PREREQUISITES_REQUIRED");
      }

      if (input.lessonKey === "lesson.swd.c0.drawing_zero") {
        const [baseline] = await tx.select({ id: exerciseAttempts.id }).from(exerciseAttempts).where(and(eq(exerciseAttempts.userId, input.userId), eq(exerciseAttempts.exerciseKey, "exercise.swd.c0.drawing_zero"), eq(exerciseAttempts.status, "SUBMITTED"))).limit(1);
        if (!baseline) throw new Error("DRAWING_ZERO_REQUIRED");
      }

      const [previousCycle] = await tx.select({ status: cycleProgress.status }).from(cycleProgress).where(and(eq(cycleProgress.userId, input.userId), eq(cycleProgress.cycleKey, cycle.cycleKey))).limit(1);
      const now = new Date();
      await tx.insert(lessonProgress).values({ userId: input.userId, lessonKey: input.lessonKey, lessonVersion: input.lessonVersion, status: "COMPLETED", reflection: input.reflection ?? {}, completedAt: now, updatedAt: now }).onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonKey], set: { lessonVersion: input.lessonVersion, status: "COMPLETED", reflection: input.reflection ?? {}, completedAt: now, updatedAt: now } });

      existingCompleted.add(input.lessonKey);
      const completedLessons = cycle.lessonKeys.filter((key) => existingCompleted.has(key)).length;
      const cycleCompleted = completedLessons === cycle.lessonKeys.length;
      const newlyCompleted = cycleCompleted && previousCycle?.status !== "COMPLETED";

      await tx.insert(cycleProgress).values({ userId: input.userId, cycleKey: cycle.cycleKey, status: cycleCompleted ? "COMPLETED" : "ACTIVE", completedLessons, completedAt: cycleCompleted ? now : null, updatedAt: now }).onConflictDoUpdate({ target: [cycleProgress.userId, cycleProgress.cycleKey], set: { status: cycleCompleted ? "COMPLETED" : "ACTIVE", completedLessons, completedAt: cycleCompleted ? now : null, updatedAt: now } });

      if (newlyCompleted) {
        await tx.insert(journeyEntries).values({ userId: input.userId, type: "CYCLE_COMPLETED", title: cycle.title, metadata: { cycleKey: cycle.cycleKey, transformation: cycle.transformation }, occurredAt: now });
      }

      await tx.insert(outboxEvents).values({ eventType: newlyCompleted ? "learning.cycle.completed.v1" : "learning.lesson.completed.v1", aggregateType: newlyCompleted ? "cycle_progress" : "lesson_progress", aggregateId: `${input.userId}:${newlyCompleted ? cycle.cycleKey : input.lessonKey}`, payload: { userId: input.userId, lessonKey: input.lessonKey, lessonVersion: input.lessonVersion, cycleKey: cycle.cycleKey, completedLessons, cycleCompleted } });
      return { cycleKey: cycle.cycleKey, cycleCompleted, completedLessons };
    });
  }
}
