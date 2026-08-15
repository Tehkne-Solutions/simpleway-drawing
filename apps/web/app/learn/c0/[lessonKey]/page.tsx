import { C0_LESSONS, getC0Lesson } from "@swd/content";
import { notFound } from "next/navigation";
import "../../foundation-visual-study-v137.css";
import { FoundationLessonPlayer } from "../../lesson-player";

export default async function LessonPage({ params }: { params: Promise<{ lessonKey: string }> }) {
  const { lessonKey } = await params;
  const decoded = decodeURIComponent(lessonKey);
  const lesson = getC0Lesson(decoded);
  if (!lesson) notFound();
  const index = C0_LESSONS.findIndex((item) => item.key === lesson.key);
  const nextLessonKey = C0_LESSONS[index + 1]?.key ?? null;
  return <FoundationLessonPlayer lesson={lesson} cycleSlug="c0" nextLessonKey={nextLessonKey} lessonIndex={index} lessonCount={C0_LESSONS.length} />;
}
