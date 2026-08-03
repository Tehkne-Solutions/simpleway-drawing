import { lessonSchema, type LessonDefinition } from "./index";
import { C4_LESSONS as RAW_C4_LESSONS } from "./c4-lessons";

export const C4_LESSONS: LessonDefinition[] = lessonSchema.array().parse(RAW_C4_LESSONS);

export function getC4Lesson(key: string): LessonDefinition | null {
  return C4_LESSONS.find((lesson) => lesson.key === key) ?? null;
}
