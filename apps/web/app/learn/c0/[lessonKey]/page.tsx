import { C0_LESSONS, getC0Lesson } from "@swd/content";
import { notFound } from "next/navigation";
import { FoundationLessonPlayer } from "../../lesson-player";

export default async function LessonPage({ params }: { params: Promise<{ lessonKey: string }> }) {
  const { lessonKey } = await params;
  const decoded = decodeURIComponent(lessonKey);
  const lesson = getC0Lesson(decoded);
  if (!lesson) notFound();

  const index = C0_LESSONS.findIndex((item) => item.key === lesson.key);
  const nextLessonKey = C0_LESSONS[index + 1]?.key ?? null;

  return (
    <main className="flow-shell">
      <article className="flow-card">
        <p className="eyebrow">C0 · Lição {index + 1} de {C0_LESSONS.length}</p>
        <h1 className="flow-title">{lesson.title["pt-BR"]}</h1>
        <p className="lead compact">{lesson.objective["pt-BR"]}</p>
        <FoundationLessonPlayer lesson={lesson} cycleSlug="c0" nextLessonKey={nextLessonKey} />
      </article>
    </main>
  );
}
