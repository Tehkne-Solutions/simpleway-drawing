import { C2_LESSONS, getC2Lesson } from "@swd/content/c2";
import { notFound } from "next/navigation";
import { FoundationLessonPlayer } from "../../lesson-player";

export default async function C2LessonPage({ params }: { params: Promise<{ lessonKey: string }> }) {
  const { lessonKey } = await params;
  const decoded = decodeURIComponent(lessonKey);
  const lesson = getC2Lesson(decoded);
  if (!lesson) notFound();

  const index = C2_LESSONS.findIndex((item) => item.key === lesson.key);
  const nextLessonKey = C2_LESSONS[index + 1]?.key ?? null;

  return (
    <main className="flow-shell">
      <article className="flow-card">
        <p className="eyebrow">C2 · Lição {index + 1} de {C2_LESSONS.length}</p>
        <h1 className="flow-title">{lesson.title["pt-BR"]}</h1>
        <p className="lead compact">{lesson.objective["pt-BR"]}</p>
        <FoundationLessonPlayer lesson={lesson} cycleSlug="c2" nextLessonKey={nextLessonKey} />
      </article>
    </main>
  );
}
