import { C4_LESSONS, getC4Lesson } from "@swd/content/c4";
import { notFound } from "next/navigation";
import { FoundationLessonPlayer } from "../../lesson-player";

export default async function C4LessonPage({ params }: { params: Promise<{ lessonKey: string }> }) {
  const { lessonKey } = await params;
  const lesson = getC4Lesson(decodeURIComponent(lessonKey));
  if (!lesson) notFound();
  const index = C4_LESSONS.findIndex((item) => item.key === lesson.key);
  const nextLessonKey = C4_LESSONS[index + 1]?.key ?? null;

  return (
    <main className="flow-shell">
      <section className="flow-card lesson-card">
        <p className="eyebrow">C4 · Form</p>
        <h1 className="flow-title">{lesson.title["pt-BR"]}</h1>
        <p className="lead compact">{lesson.objective["pt-BR"]}</p>
        <FoundationLessonPlayer lesson={lesson} cycleSlug="c4" nextLessonKey={nextLessonKey} />
      </section>
    </main>
  );
}
