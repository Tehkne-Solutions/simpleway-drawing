import { lessonSchema, type LessonDefinition } from "./index";
import { C2_LESSONS as RAW_C2_LESSONS } from "./c2-lessons";

export const C2_LESSONS: LessonDefinition[] = lessonSchema.array().parse(RAW_C2_LESSONS);

export function getC2Lesson(key: string): LessonDefinition | null {
  return C2_LESSONS.find((lesson) => lesson.key === key) ?? null;
}
