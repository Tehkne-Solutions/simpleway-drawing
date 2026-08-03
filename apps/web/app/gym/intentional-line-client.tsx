"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Point = { x: number; y: number };
type Result = {
  score: number;
  masteryScore: number;
  masteryLevel: string;
  confidence: number;
  evidenceCount: number;
  coach: { headline: string; observation: string; nextAction: string };
};

const START: Point = { x: 70, y: 190 };
const END: Point = { x: 530, y: 90 };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointToSegmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

function metrics(points: Point[], durationMs: number) {
  const endpointError = distance(points.at(-1) ?? START, END);
  const accuracy = Math.max(0, Math.min(1, 1 - endpointError / 160));
  const meanDeviation = points.reduce((sum, point) => sum + pointToSegmentDistance(point, START, END), 0) / Math.max(points.length, 1);
  const smoothness = Math.max(0, Math.min(1, 1 - meanDeviation / 70));
  return { accuracy, smoothness, durationMs: Math.max(durationMs, 1), pointCount: points.length };
}

export function IntentionalLineClient() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startedAt = useRef(0);
  const active = useRef(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<"idle" | "drawing" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function eventPoint(event: React.PointerEvent<SVGSVGElement>): Point {
    const svg = svgRef.current;
    if (!svg) return START;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 600,
      y: ((event.clientY - rect.top) / rect.height) * 280,
    };
  }

  function reset() {
    active.current = false;
    setPoints([]);
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  async function finish(event: React.PointerEvent<SVGSVGElement>) {
    if (!active.current) return;
    active.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const finalPoints = [...points, eventPoint(event)];
    setPoints(finalPoints);
    const measured = metrics(finalPoints, performance.now() - startedAt.current);
    setStatus("saving");
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
      const response = await fetch("/api/gym/intentional-line", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(measured),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar a tentativa.");
      setResult(payload as Result);
      setStatus("idle");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Falha ao salvar tentativa.");
    }
  }

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="gym-session">
      <div className="gym-instruction">
        <p className="eyebrow">Gym · Line Control</p>
        <h1 className="flow-title">Um traço. Uma decisão.</h1>
        <p className="lead compact">Comece no círculo esquerdo e termine no alvo direito. Planeje o gesto antes de tocar a área.</p>
      </div>

      <svg
        ref={svgRef}
        className="line-gym-board"
        viewBox="0 0 600 280"
        role="img"
        aria-label="Área de treino de linha intencional"
        onPointerDown={(event) => {
          if (status === "saving") return;
          event.currentTarget.setPointerCapture(event.pointerId);
          active.current = true;
          startedAt.current = performance.now();
          setPoints([eventPoint(event)]);
          setResult(null);
          setError(null);
          setStatus("drawing");
        }}
        onPointerMove={(event) => {
          if (!active.current) return;
          setPoints((current) => [...current, eventPoint(event)]);
        }}
        onPointerUp={finish}
        onPointerCancel={() => { active.current = false; setStatus("idle"); }}
      >
        <line x1={START.x} y1={START.y} x2={END.x} y2={END.y} className="gym-guide" />
        <circle cx={START.x} cy={START.y} r="15" className="gym-start" />
        <circle cx={END.x} cy={END.y} r="24" className="gym-target-outer" />
        <circle cx={END.x} cy={END.y} r="8" className="gym-target-inner" />
        {points.length > 1 ? <polyline points={polyline} className="gym-stroke" /> : null}
      </svg>

      {status === "saving" ? <p className="gym-status">Analisando sua tentativa…</p> : null}
      {error ? <p className="flow-error" role="alert">{error}</p> : null}

      {result ? (
        <section className="coach-card" aria-live="polite">
          <div className="coach-score"><strong>{Math.round(result.score * 100)}</strong><span>execução</span></div>
          <div>
            <p className="eyebrow">First Coach</p>
            <h2>{result.coach.headline}</h2>
            <p>{result.coach.observation}</p>
            <p className="coach-action"><strong>Próxima tentativa:</strong> {result.coach.nextAction}</p>
          </div>
          <div className="mastery-strip">
            <span>Line Control</span>
            <strong>{result.masteryLevel}</strong>
            <span>{Math.round(result.masteryScore * 100)}% mastery · {result.evidenceCount} evidência(s)</span>
          </div>
        </section>
      ) : null}

      <div className="flow-actions split-actions">
        <Link className="secondary link-button" href="/learn">Voltar ao Learn</Link>
        <button className="primary" type="button" onClick={reset} disabled={status === "saving"}>Nova tentativa</button>
      </div>
    </div>
  );
}
