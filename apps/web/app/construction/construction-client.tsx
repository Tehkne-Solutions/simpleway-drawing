"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Exercise = { key: string; title: string; prompt: string; options: string[]; skillKey: string };
type Result = { correct: boolean; correctIndex: number; explanation: string; masteryScore: number; masteryLevel: string; evidenceCount: number };

function ConstructionVisual({ exerciseKey }: { exerciseKey: string }) {
  if (exerciseKey.endsWith("decomposition")) return <div className="construction-visual decomposition-demo"><span className="shape-box" /><span className="shape-capsule" /><span className="shape-cylinder" /></div>;
  if (exerciseKey.endsWith("envelope")) return <div className="construction-visual envelope-demo"><span className="envelope-object" /><i /></div>;
  if (exerciseKey.endsWith("silhouette")) return <div className="construction-visual silhouette-demo"><span /><i /></div>;
  return <div className="construction-visual overlap-demo"><span className="overlap-back" /><span className="overlap-front" /></div>;
}

export function ConstructionClient({ exercises, initialExerciseKey = null, returnTo = null }: { exercises: Exercise[]; initialExerciseKey?: string | null; returnTo?: string | null }) {
  const initialIndex = Math.max(0, initialExerciseKey ? exercises.findIndex((exercise) => exercise.key === initialExerciseKey) : 0);
  const [index, setIndex] = useState(initialIndex);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const exercise = exercises[index];

  if (!exercise) return <p>Nenhum exercício estrutural disponível.</p>;
  const exerciseKey = exercise.key;

  async function submit() {
    if (selected == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!started.current) {
        const session = await fetch("/api/session/guest", { method: "POST" });
        if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
        started.current = true;
      }
      const response = await fetch("/api/construction", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exerciseKey, answerIndex: selected }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar a construção.");
      setResult(payload as Result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registrar construção.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setIndex((current) => current + 1 >= exercises.length ? 0 : current + 1);
    setSelected(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="construction-session">
      <div className="construction-head"><div><p className="eyebrow">Construction Lab · C3</p><h1 className="flow-title">{exercise.title}</h1></div><span>{index + 1} / {exercises.length}</span></div>
      <p className="lead compact">{exercise.prompt}</p>
      {returnTo ? <aside className="lesson-checkpoint">Portal de missão ativo. Responda este desafio para liberar a cena Practice.</aside> : null}
      <ConstructionVisual exerciseKey={exerciseKey} />
      <div className="construction-options">{exercise.options.map((option, optionIndex) => { const selectedNow = selected === optionIndex; const className = result ? optionIndex === result.correctIndex ? "is-correct" : selectedNow && !result.correct ? "is-wrong" : "" : selectedNow ? "is-selected" : ""; return <button key={option} type="button" className={className} disabled={Boolean(result)} onClick={() => setSelected(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>; })}</div>
      {result ? <section className={`construction-feedback ${result.correct ? "success" : "retry"}`}><p className="eyebrow">Evidence · Structure</p><h2>{result.correct ? "A estrutura principal está bem escolhida." : "Volte às massas maiores."}</h2><p>{result.explanation}</p><div className="mastery-strip construction-mastery"><strong>{result.masteryLevel}</strong><span>{Math.round(result.masteryScore * 100)}% mastery · {result.evidenceCount} evidência(s)</span></div></section> : null}
      {error ? <p className="flow-error" role="alert">{error}</p> : null}
      <div className="flow-actions split-actions">
        <Link className="secondary link-button" href={returnTo ?? "/learn"}>{returnTo ? "Voltar à missão" : "Voltar ao Learn"}</Link>
        {result && returnTo ? <Link className="primary link-button" href={returnTo}>Retornar com Evidence →</Link> : result ? <button className="primary" type="button" onClick={next}>{index + 1 >= exercises.length ? "Recomeçar Lab" : "Próximo exercício"}</button> : <button className="primary" type="button" disabled={selected == null || busy} onClick={submit}>{busy ? "Analisando…" : "Confirmar estrutura"}</button>}
      </div>
    </div>
  );
}
