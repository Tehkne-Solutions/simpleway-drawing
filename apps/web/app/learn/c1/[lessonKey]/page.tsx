import { C1_LESSONS, getC1Lesson } from "@swd/content";
import { notFound } from "next/navigation";
import { FoundationLessonPlayer } from "../../lesson-player";

export default async function C1LessonPage({ params }: { params: Promise<{ lessonKey: string }> }) {
  const { lessonKey } = await params;
  const decoded = decodeURIComponent(lessonKey);
  const lesson = getC1Lesson(decoded);
  if (!lesson) notFound();

  const index = C1_LESSONS.findIndex((item) => item.key === lesson.key);
  const nextLessonKey = C1_LESSONS[index + 1]?.key ?? null;

  return (
    <main className="flow-shell">
      <article className="flow-card">
        <p className="eyebrow">C1 · Lição {index + 1} de {C1_LESSONS.length}</p>
        <h1 className="flow-title">{lesson.title["pt-BR"]}</h1>
        <p className="lead compact">{lesson.objective["pt-BR"]}</p>
        <FoundationLessonPlayer lesson={lesson} cycleSlug="c1" nextLessonKey={nextLessonKey} />
      </article>
    </main>
  );
}
