"use client";

import type { LessonBlock, LessonDefinition } from "@swd/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FoundationVisualStudy } from "./foundation-visual-study";

type CycleSlug = "c0" | "c1" | "c2" | "c3" | "c4";
type MissionState = {
  lessonKey: string;
  practices: Array<{ exerciseKey: string; completed: boolean }>;
  drawingZeroRequired: boolean;
  drawingZeroComplete: boolean;
  ready: boolean;
};
type MissionStatus = "loading" | "online" | "offline";
type SavedMission = { sceneIndex?: number; reflection?: Record<string, string>; visited?: number[] };

const sceneNames: Record<LessonBlock["type"], string> = {
  HOOK: "BRIEFING",
  TEXT: "CODEX",
  DEMONSTRATION: "DEMONSTRAÇÃO",
  CHECKPOINT: "SINAL DE CROMA",
  DRAWING_ZERO: "PROVA",
  PRACTICE: "DESAFIO",
  REFLECTION: "DEBRIEF",
};

const sceneGlyphs: Record<LessonBlock["type"], string> = {
  HOOK: "◎", TEXT: "▤", DEMONSTRATION: "◇", CHECKPOINT: "C", DRAWING_ZERO: "✦", PRACTICE: "⚔", REFLECTION: "◉",
};

function text(value: Record<string, string>): string {
  return value["pt-BR"] ?? Object.values(value)[0] ?? "";
}

function practiceHref(exerciseKey: string, returnTo: string): string {
  const base = exerciseKey.startsWith("exercise.swd.observation.") ? "/observation"
    : exerciseKey.startsWith("exercise.swd.construction.") ? "/construction"
      : exerciseKey.startsWith("exercise.swd.form.") ? "/form"
        : "/gym";
  return `${base}?exercise=${encodeURIComponent(exerciseKey)}&returnTo=${encodeURIComponent(returnTo)}`;
}

function reflectionId(index: number) { return `reflection-${index}`; }

function cromaCopy(block: LessonBlock, resolved: boolean): { title: string; text: string } {
  if (block.type === "PRACTICE") return resolved
    ? { title: "Evidence recebida.", text: "O portal reconheceu sua tentativa. Você pode voltar à missão e seguir sem perder o fio." }
    : { title: "Conhecimento precisa virar gesto.", text: "Esta cena não abre pelo tempo de tela. Entre no desafio indicado e produza uma tentativa real." };
  if (block.type === "DRAWING_ZERO") return resolved
    ? { title: "O ponto zero está guardado.", text: "Não há nota aqui. Esta evidência existe para que o futuro consiga conversar com o seu começo." }
    : { title: "Antes de ensinar, precisamos observar.", text: "Registre como você desenha agora. Não corrija para agradar o sistema; preserve seu ponto de partida." };
  if (block.type === "REFLECTION") return resolved
    ? { title: "Decisão registrada.", text: "Reflexão não é resposta certa: é uma marca do que você percebeu nesta passagem." }
    : { title: "Nomeie o que você percebeu.", text: "Escolha a opção que melhor representa sua leitura agora. Você poderá pensar diferente depois — isso também é evolução." };
  if (block.type === "DEMONSTRATION") return { title: "Observe a ordem, não decore os passos.", text: "A sequência existe para reduzir carga mental. Depois você poderá comprimi-la em um gesto único." };
  if (block.type === "CHECKPOINT") return { title: "Este é o sinal que vale levar adiante.", text: "Se você esquecer o restante da cena, preserve esta ideia como referência para a próxima tentativa." };
  if (block.type === "HOOK") return { title: "Entre pela pergunta.", text: "Não tente estudar tudo de uma vez. Descubra qual problema esta missão quer tornar visível." };
  return { title: "Leia como artista, não como prova.", text: "Procure uma decisão que você possa testar no papel ou no canvas. Informação só ganha valor quando muda seu processo." };
}

export function FoundationLessonPlayer({ lesson, cycleSlug, nextLessonKey, lessonIndex, lessonCount }: { lesson: LessonDefinition; cycleSlug: CycleSlug; nextLessonKey: string | null; lessonIndex: number; lessonCount: number }) {
  const router = useRouter();
  const storageKey = `swd.learn.mission.v1.${lesson.key}`;
  const returnTo = `/learn/${cycleSlug}/${encodeURIComponent(lesson.key)}`;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [reflection, setReflection] = useState<Record<string, string>>({});
  const [missionState, setMissionState] = useState<MissionState | null>(null);
  const [missionStatus, setMissionStatus] = useState<MissionStatus>("loading");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as SavedMission;
        if (typeof saved.sceneIndex === "number") setSceneIndex(Math.max(0, Math.min(lesson.blocks.length - 1, saved.sceneIndex)));
        if (saved.reflection && typeof saved.reflection === "object") setReflection(saved.reflection);
        if (Array.isArray(saved.visited)) setVisited(new Set(saved.visited.filter((index) => Number.isInteger(index) && index >= 0 && index < lesson.blocks.length)));
      }
    } catch {}
    setHydrated(true);
  }, [lesson.blocks.length, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    setVisited((current) => current.has(sceneIndex) ? current : new Set([...current, sceneIndex]));
  }, [hydrated, sceneIndex]);

  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ sceneIndex, reflection, visited: [...visited] } satisfies SavedMission)); } catch {}
  }, [hydrated, reflection, sceneIndex, storageKey, visited]);

  const refreshMissionState = useCallback(async () => {
    setMissionStatus("loading");
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("SESSION_UNAVAILABLE");
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lesson.key)}/mission-state`, { cache: "no-store" });
      if (!response.ok) throw new Error("MISSION_STATE_UNAVAILABLE");
      const state = await response.json() as MissionState;
      setMissionState(state);
      setMissionStatus("online");
      setError(null);
    } catch {
      setMissionStatus("offline");
    }
  }, [lesson.key]);

  useEffect(() => {
    void refreshMissionState();
    const onFocus = () => { void refreshMissionState(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void refreshMissionState(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisibility); };
  }, [refreshMissionState]);

  const block = lesson.blocks[sceneIndex] ?? lesson.blocks[0]!;
  const isResolved = useCallback((index: number) => {
    if (!visited.has(index)) return false;
    const candidate = lesson.blocks[index];
    if (!candidate) return false;
    if (candidate.type === "PRACTICE") return missionState?.practices.some((practice) => practice.exerciseKey === candidate.exerciseKey && practice.completed) === true;
    if (candidate.type === "DRAWING_ZERO") return missionState?.drawingZeroComplete === true;
    if (candidate.type === "REFLECTION") return Boolean(reflection[reflectionId(index)]);
    return true;
  }, [lesson.blocks, missionState, reflection, visited]);

  const sceneResolved = isResolved(sceneIndex);
  const allReflectionsResolved = lesson.blocks.every((candidate, index) => candidate.type !== "REFLECTION" || Boolean(reflection[reflectionId(index)]));
  const finalScene = sceneIndex === lesson.blocks.length - 1;
  const canComplete = Boolean(missionState?.ready) && allReflectionsResolved && lesson.blocks.every((_, index) => isResolved(index));
  const progress = Math.round((lesson.blocks.filter((_, index) => isResolved(index)).length / lesson.blocks.length) * 100);
  const coach = cromaCopy(block, sceneResolved);

  function goScene(index: number) {
    if (index < 0 || index >= lesson.blocks.length) return;
    if (index <= sceneIndex || visited.has(index)) setSceneIndex(index);
  }

  function nextScene() {
    if (!sceneResolved || finalScene) return;
    setSceneIndex((current) => Math.min(lesson.blocks.length - 1, current + 1));
  }

  async function complete() {
    if (!canComplete || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lesson.key)}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reflection }) });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "LESSON_PRACTICE_REQUIRED" && typeof result.exerciseKey === "string") {
          await refreshMissionState();
          const practiceIndex = lesson.blocks.findIndex((candidate) => candidate.type === "PRACTICE" && candidate.exerciseKey === result.exerciseKey);
          if (practiceIndex >= 0) setSceneIndex(practiceIndex);
          setError("O desafio desta missão ainda precisa gerar Evidence.");
          return;
        }
        if (result.code === "DRAWING_ZERO_REQUIRED") {
          const zeroIndex = lesson.blocks.findIndex((candidate) => candidate.type === "DRAWING_ZERO");
          if (zeroIndex >= 0) setSceneIndex(zeroIndex);
          setError("O Drawing Zero ainda precisa ser registrado.");
          return;
        }
        if (result.code === "LESSON_PREREQUISITES_REQUIRED" || result.code === "CYCLE_PREREQUISITE_REQUIRED") { router.push("/learn"); return; }
        throw new Error(result.code ?? "Não foi possível salvar seu progresso.");
      }
      try { sessionStorage.removeItem(storageKey); } catch {}
      router.push(nextLessonKey ? `/learn/${cycleSlug}/${encodeURIComponent(nextLessonKey)}` : "/learn");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a missão.");
    } finally { setSaving(false); }
  }

  const renderScene = () => {
    if (block.type === "HOOK") return <div className="mission-hook"><span>“</span><p>{text(block.text)}</p></div>;
    if (block.type === "TEXT") return <div className="mission-codex">{block.title ? <h2>{text(block.title)}</h2> : null}<p>{text(block.text)}</p><div className="mission-codex-mark">SWD · {cycleSlug.toUpperCase()}</div></div>;
    if (block.type === "DEMONSTRATION") return <div className="mission-demo"><h2>{text(block.title)}</h2><FoundationVisualStudy lessonKey={lesson.key} /><div className="mission-demo-steps">{block.steps.map((step, index) => <article key={index}><b>{String(index + 1).padStart(2, "0")}</b><span>{text(step)}</span></article>)}</div></div>;
    if (block.type === "CHECKPOINT") return <div className="mission-signal"><span className="mission-signal-seal">C</span><div><p className="eyebrow">Sinal de Croma</p><h2>{text(block.text)}</h2></div></div>;
    if (block.type === "DRAWING_ZERO") return <div className={`mission-portal ${sceneResolved ? "is-resolved" : ""}`}><span className="mission-portal-glyph">✦</span><p className="eyebrow">Prova sem nota</p><h2>{sceneResolved ? "Drawing Zero registrado." : "Preserve o seu ponto de partida."}</h2><p>O desenho fica privado. Ele não recebe nota e serve para tornar sua transformação visível mais tarde.</p><Link className="primary link-button" href={`/drawing-zero?returnTo=${encodeURIComponent(returnTo)}`}>{sceneResolved ? "Revisitar Drawing Zero" : "Fazer Drawing Zero"}</Link>{sceneResolved ? <strong className="mission-evidence-stamp">EVIDENCE ✓</strong> : null}</div>;
    if (block.type === "PRACTICE") {
      const practiceComplete = missionState?.practices.some((practice) => practice.exerciseKey === block.exerciseKey && practice.completed) === true;
      return <div className={`mission-portal ${practiceComplete ? "is-resolved" : ""}`}><span className="mission-portal-glyph">⚔</span><p className="eyebrow">Portal de Practice</p><h2>{text(block.title)}</h2><p>{text(block.text)}</p><Link className="primary link-button" href={practiceHref(block.exerciseKey, returnTo)}>{practiceComplete ? "Revisitar desafio" : "Entrar no desafio"}</Link>{practiceComplete ? <strong className="mission-evidence-stamp">EVIDENCE ✓</strong> : <small>A próxima cena abre depois de uma tentativa submetida.</small>}</div>;
    }
    const id = reflectionId(sceneIndex);
    return <fieldset className="mission-reflection"><legend>{text(block.prompt)}</legend><p>Escolha a leitura que melhor representa este momento.</p><div>{block.options.map((option) => { const value = text(option); return <label key={value} className={reflection[id] === value ? "selected" : ""}><input type="radio" name={id} value={value} checked={reflection[id] === value} onChange={() => setReflection((current) => ({ ...current, [id]: value }))} /><span>{value}</span><b>{reflection[id] === value ? "✓" : "○"}</b></label>; })}</div></fieldset>;
  };

  return <main className={`foundation-mission-page mission-${cycleSlug}`}>
    <header className="foundation-mission-header">
      <Link href="/learn" className="mission-exit">← Campanha</Link>
      <div className="mission-title-lockup"><span>{cycleSlug.toUpperCase()} · MISSÃO {lessonIndex + 1}/{lessonCount}</span><strong>{text(lesson.title)}</strong><small>{text(lesson.objective)}</small></div>
      <div className="mission-progress-lockup"><span>{progress}%</span><div><i style={{ width: `${progress}%` }} /></div><small>{lesson.estimatedActiveMinutes} min ativos</small></div>
    </header>

    <section className="foundation-mission-stage">
      <nav className="mission-scene-rail" aria-label="Cenas da missão">
        {lesson.blocks.map((candidate, index) => { const resolved = isResolved(index); const current = index === sceneIndex; const accessible = index <= sceneIndex || visited.has(index); return <button key={index} type="button" disabled={!accessible} onClick={() => goScene(index)} className={`${current ? "is-current" : ""} ${resolved ? "is-resolved" : ""}`} title={`${sceneNames[candidate.type]} · Cena ${index + 1}`}><b>{resolved ? "✓" : sceneGlyphs[candidate.type]}</b><span>{String(index + 1).padStart(2, "0")}</span><small>{sceneNames[candidate.type]}</small></button>; })}
      </nav>

      <article className={`mission-scene mission-scene-${block.type.toLowerCase()}`}>
        <div className="mission-scene-meta"><span>{sceneGlyphs[block.type]}</span><div><p className="eyebrow">Cena {sceneIndex + 1}/{lesson.blocks.length}</p><strong>{sceneNames[block.type]}</strong></div><b>{sceneResolved ? "RESOLVIDA" : block.type === "PRACTICE" || block.type === "DRAWING_ZERO" ? "PORTAL BLOQUEADO" : block.type === "REFLECTION" ? "DECISÃO PENDENTE" : "EM CURSO"}</b></div>
        <div className="mission-scene-content">{renderScene()}</div>
        {error ? <p className="mission-error" role="alert">{error}</p> : null}
        <footer className="mission-scene-controls">
          <button type="button" onClick={() => setSceneIndex((current) => Math.max(0, current - 1))} disabled={sceneIndex === 0}>← Cena anterior</button>
          {!finalScene ? <button className="primary" type="button" onClick={nextScene} disabled={!sceneResolved}>Próxima cena →</button> : <button className="primary" type="button" onClick={complete} disabled={!canComplete || saving || missionStatus !== "online"}>{saving ? "Registrando missão…" : nextLessonKey ? "Concluir missão →" : `Concluir ${cycleSlug.toUpperCase()} →`}</button>}
        </footer>
      </article>

      <aside className="mission-croma-brief">
        <div className="mission-croma-mark" aria-hidden="true">C</div><p className="eyebrow">Croma · Mentor da cena</p><h2>{coach.title}</h2><p>{coach.text}</p>
        <div className={`mission-runtime runtime-${missionStatus}`}><span>{missionStatus === "online" ? "●" : missionStatus === "loading" ? "◌" : "○"}</span><div><strong>{missionStatus === "online" ? "Evidence conectada" : missionStatus === "loading" ? "Lendo missão…" : "Modo local"}</strong><small>{missionStatus === "online" ? missionState?.ready ? "Portais autoritativos resolvidos." : "Aguardando os portais desta missão." : missionStatus === "offline" ? "Você pode ler e refletir, mas Practice não será liberada sem runtime." : ""}</small></div></div>
        <div className="mission-objective"><span>OBJETIVO</span><p>{text(lesson.objective)}</p></div>
      </aside>
    </section>
  </main>;
}
