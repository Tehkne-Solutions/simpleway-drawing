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
  skillKey: string;
  coach: { headline: string; observation: string; nextAction: string };
};

export type MotorExerciseKey =
  | "exercise.swd.gym.intentional_line"
  | "exercise.swd.gym.curve_path"
  | "exercise.swd.gym.ellipse_control"
  | "exercise.swd.gym.parallel_rails";

const DRILLS: Record<MotorExerciseKey, { title: string; subtitle: string; guide: string; samples: Point[] }> = {
  "exercise.swd.gym.intentional_line": { title: "Linha intencional", subtitle: "Planeje origem e destino. Execute uma linha contínua sem serrilhar.", guide: "M70 190 L530 90", samples: Array.from({ length: 41 }, (_, index) => ({ x: 70 + (460 * index) / 40, y: 190 - (100 * index) / 40 })) },
  "exercise.swd.gym.curve_path": { title: "Curve Path", subtitle: "Percorra a curva inteira como um único gesto contínuo.", guide: "M70 190 C210 40 390 245 530 90", samples: Array.from({ length: 61 }, (_, index) => { const t = index / 60; const mt = 1 - t; return { x: mt ** 3 * 70 + 3 * mt ** 2 * t * 210 + 3 * mt * t ** 2 * 390 + t ** 3 * 530, y: mt ** 3 * 190 + 3 * mt ** 2 * t * 40 + 3 * mt * t ** 2 * 245 + t ** 3 * 90 }; }) },
  "exercise.swd.gym.ellipse_control": { title: "Ellipse Control", subtitle: "Faça uma elipse contínua acompanhando o eixo e os limites.", guide: "M140 140 A160 80 0 1 0 460 140 A160 80 0 1 0 140 140", samples: Array.from({ length: 73 }, (_, index) => { const angle = (Math.PI * 2 * index) / 72; return { x: 300 + Math.cos(angle) * 160, y: 140 + Math.sin(angle) * 80 }; }) },
  "exercise.swd.gym.parallel_rails": { title: "Parallel Rails", subtitle: "Desenhe sobre a linha-alvo mantendo a direção paralela à guia superior.", guide: "M80 165 L520 95", samples: Array.from({ length: 41 }, (_, index) => ({ x: 80 + (440 * index) / 40, y: 165 - (70 * index) / 40 })) },
};

function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function nearestDistance(point: Point, reference: Point[]): number { let best = Number.POSITIVE_INFINITY; for (const sample of reference) best = Math.min(best, distance(point, sample)); return best; }
function computeMetrics(points: Point[], reference: Point[], durationMs: number) {
  const meanDeviation = points.reduce((sum, point) => sum + nearestDistance(point, reference), 0) / Math.max(points.length, 1);
  const accuracy = Math.max(0, Math.min(1, 1 - meanDeviation / 55));
  let angleChange = 0; let samples = 0;
  for (let index = 2; index < points.length; index += 1) { const a = points[index - 2]; const b = points[index - 1]; const c = points[index]; if (!a || !b || !c) continue; const first = Math.atan2(b.y - a.y, b.x - a.x); const second = Math.atan2(c.y - b.y, c.x - b.x); let delta = Math.abs(second - first); if (delta > Math.PI) delta = Math.PI * 2 - delta; angleChange += delta; samples += 1; }
  const smoothness = Math.max(0, Math.min(1, 1 - (angleChange / Math.max(samples, 1)) / 0.7));
  return { accuracy, smoothness, durationMs: Math.max(durationMs, 1), pointCount: points.length };
}

export function MotorDrillClient({ exerciseKey, returnTo = null }: { exerciseKey: MotorExerciseKey; returnTo?: string | null }) {
  const config = DRILLS[exerciseKey];
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startedAt = useRef(0);
  const active = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<"idle" | "drawing" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function eventPoint(event: React.PointerEvent<SVGSVGElement>): Point { const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return { x: 0, y: 0 }; return { x: ((event.clientX - rect.left) / rect.width) * 600, y: ((event.clientY - rect.top) / rect.height) * 280 }; }
  function reset() { active.current = false; pointsRef.current = []; setPoints([]); setResult(null); setError(null); setStatus("idle"); }

  async function finish(event: React.PointerEvent<SVGSVGElement>) {
    if (!active.current) return;
    active.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const finalPoints = [...pointsRef.current, eventPoint(event)];
    pointsRef.current = finalPoints; setPoints(finalPoints); setStatus("saving");
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
      const response = await fetch("/api/gym/motor-drill", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exerciseKey, ...computeMetrics(finalPoints, config.samples, performance.now() - startedAt.current) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar a tentativa.");
      setResult(payload as Result); setStatus("idle");
    } catch (cause) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Falha ao salvar tentativa."); }
  }

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return <div className="gym-session">
    <div className="gym-instruction"><p className="eyebrow">Gym · C1 Control</p><h1 className="flow-title">{config.title}</h1><p className="lead compact">{config.subtitle}</p></div>
    {returnTo ? <aside className="lesson-checkpoint">Portal de missão ativo. Faça um gesto completo para gerar Evidence e liberar a cena Practice.</aside> : null}
    <svg ref={svgRef} className="line-gym-board" viewBox="0 0 600 280" role="img" aria-label={`Área de treino ${config.title}`} onPointerDown={(event) => { if (status === "saving") return; event.currentTarget.setPointerCapture(event.pointerId); const first = eventPoint(event); active.current = true; startedAt.current = performance.now(); pointsRef.current = [first]; setPoints([first]); setResult(null); setError(null); setStatus("drawing"); }} onPointerMove={(event) => { if (!active.current) return; const next = eventPoint(event); pointsRef.current = [...pointsRef.current, next]; setPoints(pointsRef.current); }} onPointerUp={finish} onPointerCancel={() => { active.current = false; setStatus("idle"); }}>
      {exerciseKey === "exercise.swd.gym.parallel_rails" ? <path d="M80 115 L520 45" className="gym-secondary-guide" /> : null}
      <path d={config.guide} className="gym-guide-path" />
      {points.length > 1 ? <polyline points={polyline} className="gym-stroke" /> : null}
    </svg>
    {status === "saving" ? <p className="gym-status">Analisando sua tentativa…</p> : null}
    {error ? <p className="flow-error" role="alert">{error}</p> : null}
    {result ? <section className="coach-card" aria-live="polite"><div className="coach-score"><strong>{Math.round(result.score * 100)}</strong><span>execução</span></div><div><p className="eyebrow">Art Coach</p><h2>{result.coach.headline}</h2><p>{result.coach.observation}</p><p className="coach-action"><strong>Próxima tentativa:</strong> {result.coach.nextAction}</p></div><div className="mastery-strip"><span>{result.skillKey.split(".").at(-1)?.replaceAll("_", " ")}</span><strong>{result.masteryLevel}</strong><span>{Math.round(result.masteryScore * 100)}% mastery · {result.evidenceCount} evidência(s)</span></div></section> : null}
    <div className="flow-actions split-actions">
      <Link className="secondary link-button" href={returnTo ?? "/skills"}>{returnTo ? "Voltar à missão" : "Ver plano adaptativo"}</Link>
      {result && returnTo ? <Link className="primary link-button" href={returnTo}>Retornar com Evidence →</Link> : <button className="primary" type="button" onClick={reset} disabled={status === "saving"}>Nova tentativa</button>}
    </div>
  </div>;
}
