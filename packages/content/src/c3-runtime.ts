import { lessonSchema, type LessonDefinition } from "./index";
import { C3_LESSONS as RAW_C3_LESSONS } from "./c3-lessons";

export const C3_LESSONS: LessonDefinition[] = lessonSchema.array().parse(RAW_C3_LESSONS);

export function getC3Lesson(key: string): LessonDefinition | null {
  return C3_LESSONS.find((lesson) => lesson.key === key) ?? null;
}
