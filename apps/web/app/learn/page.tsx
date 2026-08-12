import type { LessonDefinition } from "@swd/content";
import { C0_LESSONS, C1_LESSONS } from "@swd/content";
import { C2_LESSONS } from "@swd/content/c2";
import { C3_LESSONS } from "@swd/content/c3";
import { C4_LESSONS } from "@swd/content/c4";
import Link from "next/link";
import { getLearningProgressRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import "./learn-v1.css";

export const dynamic = "force-dynamic";

type CycleSlug = "c0" | "c1" | "c2" | "c3" | "c4";
type LessonList = LessonDefinition[];

type CycleMeta = {
  title: string;
  societyName: string;
  description: string;
  lock: string;
  atelier: string;
  atelierHref: string;
  pigment: string;
};

const cycleMeta: Record<CycleSlug, CycleMeta> = {
  c0: { title: "I Can Draw", societyName: "Portal do Olhar", description: "Aprenda o ritual fundamental: observar, tentar, comparar e corrigir.", lock: "Primeira região da campanha.", atelier: "Drawing Zero", atelierHref: "/drawing-zero", pigment: "gold" },
  c1: { title: "Control", societyName: "Atelier do Gesto", description: "Domine linha, curva, elipse, direção, pressão e ritmo.", lock: "Conclua o Portal do Olhar para abrir esta região.", atelier: "Desafio do Gesto", atelierHref: "/gym", pigment: "terracotta" },
  c2: { title: "Learn to See", societyName: "Atelier do Olhar", description: "Treine proporção, ângulo, alinhamento, landmarks e espaço negativo.", lock: "Conclua o Atelier do Gesto para abrir esta região.", atelier: "Desafio do Olhar", atelierHref: "/observation", pigment: "ultramarine" },
  c3: { title: "Shape Language", societyName: "Atelier da Estrutura", description: "Transforme percepção em envelope, formas simples, silhueta e sobreposição.", lock: "Conclua o Atelier do Olhar para abrir esta região.", atelier: "Desafio da Estrutura", atelierHref: "/construction", pigment: "veronese" },
  c4: { title: "Thinking in 3D", societyName: "Atelier do Volume", description: "Converta shapes em caixas, cilindros, elipses no espaço e rotação mental.", lock: "Conclua o Atelier da Estrutura para abrir esta região.", atelier: "Desafio do Volume", atelierHref: "/form", pigment: "violet" },
};

function CampaignRegion({ cycle, lessons, completedSet, unlocked, active }: { cycle: CycleSlug; lessons: LessonList; completedSet: Set<string>; unlocked: boolean; active: boolean }) {
  const doneCount = lessons.filter((lesson) => completedSet.has(lesson.key)).length;
  const progress = Math.round((doneCount / lessons.length) * 100);
  const nextLesson = unlocked ? lessons.find((lesson) => !completedSet.has(lesson.key)) ?? null : null;
  const complete = doneCount === lessons.length;
  const meta = cycleMeta[cycle];

  return (
    <article className={`campaign-region pigment-${meta.pigment} ${unlocked ? "is-unlocked" : "is-locked"} ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}>
      <div className="campaign-region-top">
        <span className="campaign-region-code">{cycle.toUpperCase()}</span>
        <span className="campaign-region-state">{complete ? "DOMINADO" : unlocked ? `${progress}%` : "SELADO"}</span>
      </div>
      <div className="campaign-region-mark" aria-hidden="true">{complete ? "✓" : unlocked ? cycle.slice(1) : "◆"}</div>
      <h2>{meta.societyName}</h2>
      <p className="campaign-region-subtitle">{meta.title}</p>
      <p>{meta.description}</p>

      <div className="campaign-mission-nodes" aria-label={`Missões de ${meta.societyName}`}>
        {lessons.map((lesson, index) => {
          const done = completedSet.has(lesson.key);
          const current = nextLesson?.key === lesson.key;
          return unlocked ? (
            <Link
              key={lesson.key}
              href={`/learn/${cycle}/${encodeURIComponent(lesson.key)}`}
              className={`${done ? "is-done" : ""} ${current ? "is-current" : ""}`}
              title={`${String(index + 1).padStart(2, "0")} · ${lesson.title["pt-BR"]}`}
              aria-label={`${lesson.title["pt-BR"]}${done ? " · concluída" : current ? " · missão atual" : ""}`}
            >{done ? "✓" : String(index + 1).padStart(2, "0")}</Link>
          ) : <span key={lesson.key} aria-hidden="true">·</span>;
        })}
      </div>

      <div className="campaign-region-action">
        {!unlocked ? <small>{meta.lock}</small>
          : nextLesson ? <Link href={`/learn/${cycle}/${encodeURIComponent(nextLesson.key)}`}><span>MISSÃO ATUAL</span><strong>{nextLesson.title["pt-BR"]}</strong><small>{nextLesson.estimatedActiveMinutes} min ativos</small></Link>
            : <Link href={meta.atelierHref}><span>DESAFIO DA REGIÃO</span><strong>{meta.atelier}</strong><small>Transforme conteúdo em Evidence.</small></Link>}
      </div>
    </article>
  );
}

export default async function LearnPage() {
  const userId = await getSessionUserId();
  const completed = userId ? await getLearningProgressRepository().getCompletedLessonKeys(userId) : [];
  const completedSet = new Set(completed);
  const cycles: Array<[CycleSlug, LessonList]> = [["c0", C0_LESSONS], ["c1", C1_LESSONS], ["c2", C2_LESSONS], ["c3", C3_LESSONS], ["c4", C4_LESSONS]];

  const completeByCycle = Object.fromEntries(cycles.map(([cycle, lessons]) => [cycle, lessons.every((lesson) => completedSet.has(lesson.key))])) as Record<CycleSlug, boolean>;
  const unlockedByCycle: Record<CycleSlug, boolean> = {
    c0: true,
    c1: completeByCycle.c0,
    c2: completeByCycle.c1,
    c3: completeByCycle.c2,
    c4: completeByCycle.c3,
  };
  const activeCycle = cycles.find(([cycle]) => unlockedByCycle[cycle] && !completeByCycle[cycle])?.[0] ?? "c4";
  const activeLessons = cycles.find(([cycle]) => cycle === activeCycle)?.[1] ?? C4_LESSONS;
  const activeNext = activeLessons.find((lesson) => !completedSet.has(lesson.key)) ?? null;
  const totalLessons = cycles.reduce((sum, [, lessons]) => sum + lessons.length, 0);
  const completedLessons = cycles.reduce((sum, [, lessons]) => sum + lessons.filter((lesson) => completedSet.has(lesson.key)).length, 0);
  const campaignProgress = Math.round((completedLessons / totalLessons) * 100);
  const activeMeta = cycleMeta[activeCycle];

  return (
    <main className="campaign-shell">
      <header className="campaign-command">
        <div className="campaign-command-copy">
          <p className="eyebrow">Sociedade Croma · Campanha Foundation</p>
          <h1>O caminho do Aprendiz do Olhar.</h1>
          <p>Avance por cinco regiões. Cada missão ensina uma ideia; cada Atelier exige que você a use. O mapa registra prática, não presença.</p>
          <div className="campaign-global-progress"><span><i style={{ width: `${campaignProgress}%` }} /></span><b>{completedLessons}/{totalLessons} missões · {campaignProgress}% da campanha</b></div>
        </div>

        <aside className="campaign-current-mission">
          <span>CROMA · PRÓXIMA MISSÃO</span>
          <strong>{activeNext ? activeNext.title["pt-BR"] : activeMeta.atelier}</strong>
          <p>{activeNext ? `${activeMeta.societyName} · ${activeNext.estimatedActiveMinutes} min ativos` : `A região está completa. Entre no ${activeMeta.atelier}.`}</p>
          <Link className="primary link-button" href={activeNext ? `/learn/${activeCycle}/${encodeURIComponent(activeNext.key)}` : activeMeta.atelierHref}>{activeNext ? "Entrar na missão" : "Abrir desafio"}</Link>
        </aside>
      </header>

      <section className="campaign-map" aria-label="Mapa da campanha Foundation">
        <div className="campaign-map-line" aria-hidden="true" />
        {cycles.map(([cycle, lessons]) => <CampaignRegion key={cycle} cycle={cycle} lessons={lessons} completedSet={completedSet} unlocked={unlockedByCycle[cycle]} active={cycle === activeCycle} />)}
      </section>

      <footer className="campaign-footer-actions">
        <Link className="secondary link-button" href="/codex">Consultar Codex Croma</Link>
        <div><Link className="secondary link-button" href="/journey">Abrir Atlas</Link><Link className="primary link-button" href="/create">Entrar no Atelier Livre</Link></div>
      </footer>
    </main>
  );
}
