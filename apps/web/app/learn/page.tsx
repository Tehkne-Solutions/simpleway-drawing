import { C0_LESSONS } from "@swd/content";
import Link from "next/link";
import { getLearningProgressRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const userId = await getSessionUserId();
  const completed = userId ? await getLearningProgressRepository().getCompletedLessonKeys(userId) : [];
  const completedSet = new Set(completed);
  const nextLesson = C0_LESSONS.find((lesson) => !completedSet.has(lesson.key)) ?? null;
  const progress = Math.round((completedSet.size / C0_LESSONS.length) * 100);

  return (
    <main className="flow-shell">
      <section className="flow-card">
        <p className="eyebrow">Learn · C0</p>
        <h1 className="flow-title">I Can Draw</h1>
        <p className="lead compact">Seu primeiro ciclo ensina a habilidade mais importante: observar, tentar, comparar, corrigir e tentar novamente.</p>

        <div className="learning-progress" aria-label={`Progresso C0 ${progress}%`}>
          <div className="learning-progress-track"><span style={{ width: `${progress}%` }} /></div>
          <strong>{completedSet.size}/{C0_LESSONS.length} lições</strong>
        </div>

        <div className="lesson-list">
          {C0_LESSONS.map((lesson, index) => {
            const done = completedSet.has(lesson.key);
            return (
              <Link className={`lesson-row ${done ? "is-complete" : ""}`} href={`/learn/c0/${encodeURIComponent(lesson.key)}`} key={lesson.key}>
                <span className="lesson-index">{done ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <span><strong>{lesson.title["pt-BR"]}</strong><small>{lesson.estimatedActiveMinutes} min ativos</small></span>
              </Link>
            );
          })}
        </div>

        <div className="flow-actions split-actions">
          <Link className="secondary link-button" href="/">Início</Link>
          {nextLesson ? <Link className="primary link-button" href={`/learn/c0/${encodeURIComponent(nextLesson.key)}`}>Continuar C0</Link> : <Link className="primary link-button" href="/journey">Ver minha Journey</Link>}
        </div>
      </section>
    </main>
  );
}
