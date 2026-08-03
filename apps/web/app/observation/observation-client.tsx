"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type Exercise = {
  key: string;
  title: string;
  prompt: string;
  options: string[];
  skillKey: string;
};

type Result = {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  masteryScore: number;
  masteryLevel: string;
  evidenceCount: number;
};

function VisualPrompt({ exerciseKey }: { exerciseKey: string }) {
  if (exerciseKey.endsWith("ratio_match")) {
    return <div className="observation-visual ratio-visual"><span className="ratio-long" /><span className="ratio-short" /></div>;
  }
  if (exerciseKey.endsWith("angle_match")) {
    return <div className="observation-visual angle-visual"><span /></div>;
  }
  if (exerciseKey.endsWith("alignment_hunt")) {
    return <div className="observation-visual alignment-visual"><i className="alignment-top" /><span className="a">A</span><span className="b">B</span><span className="c">C</span><span className="d">D</span></div>;
  }
  return <div className="observation-visual negative-space-visual"><span className="negative-left" /><span className="negative-right" /><i /></div>;
}

export function ObservationClient({ exercises }: { exercises: Exercise[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(performance.now());
  const exercise = exercises[index];
  const progress = useMemo(() => `${index + 1} / ${exercises.length}`, [index, exercises.length]);

  if (!exercise) return <p>Nenhum exercício disponível.</p>;

  async function submit() {
    if (selected == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
      const response = await fetch("/api/observation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exerciseKey: exercise.key, answerIndex: selected, responseMs: performance.now() - startedAt.current }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar a resposta.");
      setResult(payload as Result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registrar percepção.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (index + 1 >= exercises.length) {
      setIndex(0);
    } else {
      setIndex((current) => current + 1);
    }
    setSelected(null);
    setResult(null);
    setError(null);
    startedAt.current = performance.now();
  }

  return (
    <div className="observation-session">
      <div className="observation-head">
        <div><p className="eyebrow">Observation Lab · C2</p><h1 className="flow-title">{exercise.title}</h1></div>
        <span>{progress}</span>
      </div>
      <p className="lead compact">{exercise.prompt}</p>
      <VisualPrompt exerciseKey={exercise.key} />

      <div className="observation-options">
        {exercise.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const stateClass = result
            ? optionIndex === result.correctIndex ? "is-correct" : isSelected && !result.correct ? "is-wrong" : ""
            : isSelected ? "is-selected" : "";
          return <button key={option} type="button" className={stateClass} disabled={Boolean(result)} onClick={() => setSelected(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>;
        })}
      </div>

      {result ? (
        <section className={`observation-feedback ${result.correct ? "success" : "retry"}`} aria-live="polite">
          <p className="eyebrow">Evidence · Perception</p>
          <h2>{result.correct ? "Você percebeu a relação corretamente." : "Compare novamente antes de desenhar."}</h2>
          <p>{result.explanation}</p>
          <div className="mastery-strip observation-mastery"><strong>{result.masteryLevel}</strong><span>{Math.round(result.masteryScore * 100)}% mastery · {result.evidenceCount} evidência(s)</span></div>
        </section>
      ) : null}
      {error ? <p className="flow-error" role="alert">{error}</p> : null}

      <div className="flow-actions split-actions">
        <Link className="secondary link-button" href="/learn">Voltar ao Learn</Link>
        {result ? <button className="primary" type="button" onClick={next}>{index + 1 >= exercises.length ? "Recomeçar Lab" : "Próximo exercício"}</button> : <button className="primary" type="button" disabled={selected == null || busy} onClick={submit}>{busy ? "Analisando…" : "Confirmar percepção"}</button>}
      </div>
    </div>
  );
}
