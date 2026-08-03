import { C0_LESSONS, C1_LESSONS } from "@swd/content";
import { C2_LESSONS } from "@swd/content/c2";
import Link from "next/link";
import { getLearningProgressRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";

export const dynamic = "force-dynamic";

type CycleSlug = "c0" | "c1" | "c2";
type LessonList = typeof C0_LESSONS;

const cycleMeta: Record<CycleSlug, { title: string; description: string; lock: string }> = {
  c0: {
    title: "I Can Draw",
    description: "Aprenda o loop de observar, tentar, comparar e corrigir.",
    lock: "",
  },
  c1: {
    title: "Control",
    description: "Desenvolva controle motor consciente: linhas, curvas, elipses, direção, pressão e ritmo.",
    lock: "Conclua C0 para desbloquear C1. O Gym continua disponível para exploração.",
  },
  c2: {
    title: "Learn to See",
    description: "Treine proporção, ângulo, alinhamento, landmarks e espaço negativo antes de pedir execução à mão.",
    lock: "Conclua C1 para desbloquear C2. O Observation Lab continua disponível para exploração.",
  },
};

function CycleLessons({ cycle, lessons, completedSet, unlocked }: { cycle: CycleSlug; lessons: LessonList; completedSet: Set<string>; unlocked: boolean }) {
  const doneCount = lessons.filter((lesson) => completedSet.has(lesson.key)).length;
  const progress = Math.round((doneCount / lessons.length) * 100);
  const meta = cycleMeta[cycle];
  return (
    <section className={`cycle-panel ${unlocked ? "" : "is-locked"}`}>
      <div className="cycle-panel-head">
        <div>
          <p className="eyebrow">{cycle.toUpperCase()}</p>
          <h2>{meta.title}</h2>
        </div>
        <strong>{unlocked ? `${progress}%` : "Bloqueado"}</strong>
      </div>
      <p className="cycle-description">{meta.description}</p>
      {unlocked ? (
        <div className="lesson-list">
          {lessons.map((lesson, index) => {
            const done = completedSet.has(lesson.key);
            return (
              <Link className={`lesson-row ${done ? "is-complete" : ""}`} href={`/learn/${cycle}/${encodeURIComponent(lesson.key)}`} key={lesson.key}>
                <span className="lesson-index">{done ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <span><strong>{lesson.title["pt-BR"]}</strong><small>{lesson.estimatedActiveMinutes} min ativos</small></span>
              </Link>
            );
          })}
        </div>
      ) : <div className="cycle-lock-message">{meta.lock}</div>}
    </section>
  );
}

export default async function LearnPage() {
  const userId = await getSessionUserId();
  const completed = userId ? await getLearningProgressRepository().getCompletedLessonKeys(userId) : [];
  const completedSet = new Set(completed);
  const c0Complete = C0_LESSONS.every((lesson) => completedSet.has(lesson.key));
  const c1Complete = C1_LESSONS.every((lesson) => completedSet.has(lesson.key));
  const c2Complete = C2_LESSONS.every((lesson) => completedSet.has(lesson.key));
  const nextC0 = C0_LESSONS.find((lesson) => !completedSet.has(lesson.key)) ?? null;
  const nextC1 = c0Complete ? C1_LESSONS.find((lesson) => !completedSet.has(lesson.key)) ?? null : null;
  const nextC2 = c1Complete ? C2_LESSONS.find((lesson) => !completedSet.has(lesson.key)) ?? null : null;

  return (
    <main className="flow-shell">
      <section className="flow-card learn-foundation-card">
        <p className="eyebrow">Learn · Foundation</p>
        <h1 className="flow-title">Construa habilidade em camadas.</h1>
        <p className="lead compact">C0 ensina como aprender. C1 transforma intenção em controle motor. C2 separa percepção de execução e treina o olhar com Evidence própria.</p>

        <div className="foundation-cycles">
          <CycleLessons cycle="c0" lessons={C0_LESSONS} completedSet={completedSet} unlocked />
          <CycleLessons cycle="c1" lessons={C1_LESSONS} completedSet={completedSet} unlocked={c0Complete} />
          <CycleLessons cycle="c2" lessons={C2_LESSONS} completedSet={completedSet} unlocked={c1Complete} />
        </div>

        <div className="flow-actions split-actions">
          <Link className="secondary link-button" href="/">Início</Link>
          {nextC0 ? <Link className="primary link-button" href={`/learn/c0/${encodeURIComponent(nextC0.key)}`}>Continuar C0</Link>
            : nextC1 ? <Link className="primary link-button" href={`/learn/c1/${encodeURIComponent(nextC1.key)}`}>Continuar C1</Link>
              : nextC2 ? <Link className="primary link-button" href={`/learn/c2/${encodeURIComponent(nextC2.key)}`}>Continuar C2</Link>
                : c2Complete ? <Link className="primary link-button" href="/journey">Ver Foundation concluída</Link>
                  : <Link className="primary link-button" href={c1Complete ? "/observation" : "/gym"}>{c1Complete ? "Explorar Observation Lab" : "Explorar Gym"}</Link>}
        </div>
      </section>
    </main>
  );
}
