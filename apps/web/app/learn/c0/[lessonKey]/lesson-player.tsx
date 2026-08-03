"use client";

import type { LessonDefinition } from "@swd/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LessonPlayer({ lesson, nextLessonKey }: { lesson: LessonDefinition; nextLessonKey: string | null }) {
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
        throw new Error(result.code ?? "Não foi possível salvar seu progresso.");
      }
      router.push(nextLessonKey ? `/learn/c0/${encodeURIComponent(nextLessonKey)}` : "/learn");
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
        if (block.type === "HOOK") return <p className="lesson-hook" key={index}>{block.text["pt-BR"]}</p>;
        if (block.type === "TEXT") return <section className="lesson-block" key={index}>{block.title ? <h2>{block.title["pt-BR"]}</h2> : null}<p>{block.text["pt-BR"]}</p></section>;
        if (block.type === "DEMONSTRATION") return <section className="lesson-block" key={index}><h2>{block.title["pt-BR"]}</h2><ol className="demo-steps">{block.steps.map((step, stepIndex) => <li key={stepIndex}>{step["pt-BR"]}</li>)}</ol></section>;
        if (block.type === "CHECKPOINT") return <aside className="lesson-checkpoint" key={index}>{block.text["pt-BR"]}</aside>;
        if (block.type === "DRAWING_ZERO") return <section className="lesson-block lesson-action" key={index}><h2>Registre seu ponto de partida</h2><p>Seu Drawing Zero fica privado e não recebe nota. Ele existe para que você consiga enxergar sua evolução depois.</p><Link className="primary link-button" href="/drawing-zero">Fazer Drawing Zero</Link></section>;
        if (block.type === "REFLECTION") {
          const id = `reflection-${index}`;
          return <fieldset className="lesson-reflection" key={index}><legend>{block.prompt["pt-BR"]}</legend>{block.options.map((option) => {
            const value = option["pt-BR"];
            return <label key={value} className={reflection[id] === value ? "selected" : ""}><input type="radio" name={id} value={value} checked={reflection[id] === value} onChange={() => setReflection((current) => ({ ...current, [id]: value }))} /><span>{value}</span></label>;
          })}</fieldset>;
        }
        return null;
      })}

      {error ? <p className="flow-error" role="alert">{error}</p> : null}
      <div className="flow-actions split-actions">
        <Link className="secondary link-button" href="/learn">Voltar ao C0</Link>
        <button className="primary" type="button" onClick={complete} disabled={saving}>{saving ? "Salvando…" : nextLessonKey ? "Concluir e continuar" : "Concluir C0"}</button>
      </div>
    </div>
  );
}
