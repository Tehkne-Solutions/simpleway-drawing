import { C3_LESSONS, getC3Lesson } from "@swd/content/c3";
import { notFound } from "next/navigation";
import { FoundationLessonPlayer } from "../../lesson-player";

export default async function C3LessonPage({ params }: { params: Promise<{ lessonKey: string }> }) {
  const { lessonKey } = await params;
  const decoded = decodeURIComponent(lessonKey);
  const lesson = getC3Lesson(decoded);
  if (!lesson) notFound();
  const index = C3_LESSONS.findIndex((item) => item.key === lesson.key);
  const nextLessonKey = C3_LESSONS[index + 1]?.key ?? null;
  return <FoundationLessonPlayer lesson={lesson} cycleSlug="c3" nextLessonKey={nextLessonKey} lessonIndex={index} lessonCount={C3_LESSONS.length} />;
}
