"use client";

import type { LessonDefinition } from "@swd/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function text(value: Record<string, string>): string {
  return value["pt-BR"] ?? Object.values(value)[0] ?? "";
}

function practiceHref(exerciseKey: string): string {
  if (exerciseKey.startsWith("exercise.swd.observation.")) return `/observation?exercise=${encodeURIComponent(exerciseKey)}`;
  if (exerciseKey.startsWith("exercise.swd.construction.")) return `/construction?exercise=${encodeURIComponent(exerciseKey)}`;
  if (exerciseKey.startsWith("exercise.swd.form.")) return `/form?exercise=${encodeURIComponent(exerciseKey)}`;
  return `/gym?exercise=${encodeURIComponent(exerciseKey)}`;
}

export function FoundationLessonPlayer({ lesson, cycleSlug, nextLessonKey }: { lesson: LessonDefinition; cycleSlug: "c0" | "c1" | "c2" | "c3" | "c4"; nextLessonKey: string | null }) {
  const router = useRouter();
  const [reflection, setReflection] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setSaving(true);
    setError(null);
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lesson.key)}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reflection }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "DRAWING_ZERO_REQUIRED") {
          router.push("/drawing-zero");
          return;
        }
        if (result.code === "LESSON_PREREQUISITES_REQUIRED" || result.code === "CYCLE_PREREQUISITE_REQUIRED") {
          router.push("/learn");
          return;
        }
        throw new Error(result.code ?? "Não foi possível salvar seu progresso.");
      }
      router.push(nextLessonKey ? `/learn/${cycleSlug}/${encodeURIComponent(nextLessonKey)}` : "/learn");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a lição.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lesson-player">
      {lesson.blocks.map((block, index) => {
        if (block.type === "HOOK") return <p className="lesson-hook" key={index}>{text(block.text)}</p>;
        if (block.type === "TEXT") return <section className="lesson-block" key={index}>{block.title ? <h2>{text(block.title)}</h2> : null}<p>{text(block.text)}</p></section>;
        if (block.type === "DEMONSTRATION") return <section className="lesson-block" key={index}><h2>{text(block.title)}</h2><ol className="demo-steps">{block.steps.map((step, stepIndex) => <li key={stepIndex}>{text(step)}</li>)}</ol></section>;
        if (block.type === "CHECKPOINT") return <aside className="lesson-checkpoint" key={index}>{text(block.text)}</aside>;
        if (block.type === "DRAWING_ZERO") return <section className="lesson-block lesson-action" key={index}><h2>Registre seu ponto de partida</h2><p>Seu Drawing Zero fica privado e não recebe nota. Ele existe para que você consiga enxergar sua evolução depois.</p><Link className="primary link-button" href="/drawing-zero">Fazer Drawing Zero</Link></section>;
        if (block.type === "PRACTICE") return <section className="lesson-block lesson-action practice-lesson-block" key={index}><p className="eyebrow">Practice</p><h2>{text(block.title)}</h2><p>{text(block.text)}</p><Link className="primary link-button" href={practiceHref(block.exerciseKey)}>Abrir treino</Link></section>;
        if (block.type === "REFLECTION") {
          const id = `reflection-${index}`;
          return <fieldset className="lesson-reflection" key={index}><legend>{text(block.prompt)}</legend>{block.options.map((option) => {
            const value = text(option);
            return <label key={value} className={reflection[id] === value ? "selected" : ""}><input type="radio" name={id} value={value} checked={reflection[id] === value} onChange={() => setReflection((current) => ({ ...current, [id]: value }))} /><span>{value}</span></label>;
          })}</fieldset>;
        }
        return null;
      })}
      {error ? <p className="flow-error" role="alert">{error}</p> : null}
      <div className="flow-actions split-actions">
        <Link className="secondary link-button" href="/learn">Voltar ao Learn</Link>
        <button className="primary" type="button" onClick={complete} disabled={saving}>{saving ? "Salvando…" : nextLessonKey ? "Concluir e continuar" : `Concluir ${cycleSlug.toUpperCase()}`}</button>
      </div>
    </div>
  );
}
