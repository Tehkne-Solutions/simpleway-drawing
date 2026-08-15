import { C2_LESSONS, getC2Lesson } from "@swd/content/c2";
import { notFound } from "next/navigation";
import "../../foundation-visual-study-v137.css";
import { FoundationLessonPlayer } from "../../lesson-player";

export default async function C2LessonPage({ params }: { params: Promise<{ lessonKey: string }> }) {
  const { lessonKey } = await params;
  const decoded = decodeURIComponent(lessonKey);
  const lesson = getC2Lesson(decoded);
  if (!lesson) notFound();
  const index = C2_LESSONS.findIndex((item) => item.key === lesson.key);
  const nextLessonKey = C2_LESSONS[index + 1]?.key ?? null;
  return <FoundationLessonPlayer lesson={lesson} cycleSlug="c2" nextLessonKey={nextLessonKey} lessonIndex={index} lessonCount={C2_LESSONS.length} />;
}
