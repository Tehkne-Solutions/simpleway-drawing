import { exerciseAttempts } from "@swd/database";
import { getFoundationLesson, type LessonDefinition } from "@swd/content";
import { getC2Lesson } from "@swd/content/c2";
import { getC3Lesson } from "@swd/content/c3";
import { getC4Lesson } from "@swd/content/c4";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase, getLearningProgressRepository } from "./runtime";

export type FoundationMissionPractice = { exerciseKey: string; completed: boolean };
export type FoundationMissionState = {
  lessonKey: string;
  practices: FoundationMissionPractice[];
  drawingZeroRequired: boolean;
  drawingZeroComplete: boolean;
  ready: boolean;
};

export function resolveFoundationLesson(lessonKey: string): LessonDefinition | null {
  return getFoundationLesson(lessonKey) ?? getC2Lesson(lessonKey) ?? getC3Lesson(lessonKey) ?? getC4Lesson(lessonKey) ?? null;
}

export function lessonPracticeKeys(lesson: LessonDefinition): string[] {
  return [...new Set(lesson.blocks.flatMap((block) => block.type === "PRACTICE" ? [block.exerciseKey] : []))];
}

export function lessonRequiresDrawingZero(lesson: LessonDefinition): boolean {
  return lesson.blocks.some((block) => block.type === "DRAWING_ZERO") || lesson.key === "lesson.swd.c0.drawing_zero";
}

export async function getFoundationMissionState(userId: string, lesson: LessonDefinition): Promise<FoundationMissionState> {
  const practiceKeys = lessonPracticeKeys(lesson);
  const completedPracticeKeys = new Set<string>();
  if (practiceKeys.length > 0) {
    const attempts = await getDatabase().select({ exerciseKey: exerciseAttempts.exerciseKey })
      .from(exerciseAttempts)
      .where(and(
        eq(exerciseAttempts.userId, userId),
        eq(exerciseAttempts.status, "SUBMITTED"),
        inArray(exerciseAttempts.exerciseKey, practiceKeys),
      ));
    attempts.forEach((attempt) => completedPracticeKeys.add(attempt.exerciseKey));
  }

  const drawingZeroRequired = lessonRequiresDrawingZero(lesson);
  const drawingZeroComplete = drawingZeroRequired ? await getLearningProgressRepository().hasDrawingZero(userId) : true;
  const practices = practiceKeys.map((exerciseKey) => ({ exerciseKey, completed: completedPracticeKeys.has(exerciseKey) }));
  const ready = practices.every((practice) => practice.completed) && (!drawingZeroRequired || drawingZeroComplete);

  return { lessonKey: lesson.key, practices, drawingZeroRequired, drawingZeroComplete, ready };
}
