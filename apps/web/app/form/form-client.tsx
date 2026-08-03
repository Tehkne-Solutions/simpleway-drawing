"use client";

import Link from "next/link";
import { useState } from "react";

type Exercise = { key: string; title: string; prompt: string; options: string[]; skillKey: string };
type Result = { correct: boolean; correctIndex: number; explanation: string; masteryScore: number; masteryLevel: string; evidenceCount: number };

export function FormClient({ exercises }: { exercises: Exercise[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exercise = exercises[index];

  if (!exercise) return <p>Nenhum exercício de forma disponível.</p>;

  async function submit() {
    const activeExercise = exercises[index];
    if (!activeExercise || selected == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
      const response = await fetch("/api/form", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exerciseKey: activeExercise.key, answerIndex: selected }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar o treino.");
      setResult(payload as Result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no Form Lab.");
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
    <div className="form-session">
      <div className="observation-head">
        <div><p className="eyebrow">Form Lab · C4</p><h1 className="flow-title">{exercise.title}</h1></div>
        <span>{index + 1} / {exercises.length}</span>
      </div>
      <p className="lead compact">{exercise.prompt}</p>
      <div className="form-visual" aria-hidden="true"><span /><span /><span /></div>
      <div className="observation-options">
        {exercise.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const stateClass = result ? optionIndex === result.correctIndex ? "is-correct" : isSelected && !result.correct ? "is-wrong" : "" : isSelected ? "is-selected" : "";
          return <button key={option} type="button" className={stateClass} disabled={Boolean(result)} onClick={() => setSelected(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>;
        })}
      </div>
      {result ? <section className={`observation-feedback ${result.correct ? "success" : "retry"}`}><p className="eyebrow">Evidence · Form</p><h2>{result.correct ? "Seu raciocínio espacial está coerente." : "Revise eixo, plano e profundidade."}</h2><p>{result.explanation}</p><div className="mastery-strip observation-mastery"><strong>{result.masteryLevel}</strong><span>{Math.round(result.masteryScore * 100)}% mastery · {result.evidenceCount} evidência(s)</span></div></section> : null}
      {error ? <p className="flow-error" role="alert">{error}</p> : null}
      <div className="flow-actions split-actions">
        <Link className="secondary link-button" href="/learn">Voltar ao Learn</Link>
        {result ? <button className="primary" type="button" onClick={next}>{index + 1 >= exercises.length ? "Recomeçar Lab" : "Próximo exercício"}</button> : <button className="primary" type="button" disabled={selected == null || busy} onClick={submit}>{busy ? "Analisando…" : "Confirmar forma"}</button>}
      </div>
    </div>
  );
}
