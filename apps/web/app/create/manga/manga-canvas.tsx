"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; pigment: "graphite" | "sanguine" | "ultramarine" };
type View = "front" | "three-quarter" | "profile";

const WIDTH = 1080;
const HEIGHT = 720;
const STORAGE_KEY = "swd.create.manga.v1";
const COLORS = { graphite: "#292722", sanguine: "#a44e2d", ultramarine: "#315b83" } as const;

function pathFor(points: Point[]) {
  if (!points.length) return "";
  return points.reduce((path, point, index) => `${path}${index === 0 ? "M" : " L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`, "");
}

export function MangaCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>("front");
  const [pigment, setPigment] = useState<keyof typeof COLORS>("graphite");
  const [guides, setGuides] = useState({ skull: true, center: true, eyes: true, jaw: true, thirds: false });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setStrokes(JSON.parse(raw) as Stroke[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(strokes)); } catch {}
  }, [strokes, hydrated]);

  const guideGeometry = useMemo(() => {
    if (view === "profile") return { cx: 555, cy: 300, rx: 150, ry: 170, centerX: 615, eyeY: 300, jaw: "M 475 350 Q 560 500 655 372" };
    if (view === "three-quarter") return { cx: 540, cy: 300, rx: 164, ry: 175, centerX: 575, eyeY: 300, jaw: "M 410 350 Q 535 505 675 350" };
    return { cx: 540, cy: 300, rx: 170, ry: 178, centerX: 540, eyeY: 300, jaw: "M 405 350 Q 540 510 675 350" };
  }, [view]);

  function toPoint(event: React.PointerEvent<SVGSVGElement>): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function begin(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    setDraft({ points: [point], pigment });
  }

  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const point = toPoint(event);
    setDraft((current) => current ? { ...current, points: [...current.points, point] } : null);
  }

  function end() {
    setDraft((current) => {
      if (current && current.points.length > 1) setStrokes((items) => [...items, current]);
      return null;
    });
  }

  function undo() { setStrokes((items) => items.slice(0, -1)); }
  function clear() { setStrokes([]); }

  function exportSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}"><rect width="100%" height="100%" fill="#f8efd9"/>${strokes.map((stroke) => `<path d="${pathFor(stroke.points)}" fill="none" stroke="${COLORS[stroke.pigment]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "swd-manga-study.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const missionSteps = [
    { label: "Ative o crânio", done: guides.skull },
    { label: "Use eixo e linha dos olhos", done: guides.center && guides.eyes },
    { label: "Construa mandíbula", done: guides.jaw },
    { label: "Faça ao menos 6 traços próprios", done: strokes.length >= 6 },
  ];
  const doneCount = missionSteps.filter((step) => step.done).length;

  return (
    <section className="manga-workbench">
      <aside className="manga-tools" aria-label="Ferramentas do Manga Canvas">
        <div className="manga-tool-group"><span>VISTA</span><div className="manga-segmented">{(["front", "three-quarter", "profile"] as View[]).map((item) => <button key={item} className={view === item ? "is-active" : ""} onClick={() => setView(item)} type="button">{item === "front" ? "Frente" : item === "three-quarter" ? "3/4" : "Perfil"}</button>)}</div></div>
        <div className="manga-tool-group"><span>GUIAS</span>{Object.entries(guides).map(([key, value]) => <label key={key}><input type="checkbox" checked={value} onChange={(event) => setGuides((current) => ({ ...current, [key]: event.target.checked }))} />{key === "skull" ? "Crânio" : key === "center" ? "Eixo central" : key === "eyes" ? "Linha dos olhos" : key === "jaw" ? "Mandíbula" : "Terços"}</label>)}</div>
        <div className="manga-tool-group"><span>PIGMENTO</span><div className="manga-pigments">{(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((item) => <button key={item} className={pigment === item ? "is-active" : ""} style={{ "--pigment": COLORS[item] } as React.CSSProperties} onClick={() => setPigment(item)} type="button"><i />{item === "graphite" ? "Grafite" : item === "sanguine" ? "Sanguínea" : "Ultramar"}</button>)}</div></div>
        <div className="manga-tool-group manga-mission"><span>MISSÃO DE CROMA</span><strong>Construa uma cabeça antes de desenhar detalhes.</strong><ol>{missionSteps.map((step) => <li className={step.done ? "is-done" : ""} key={step.label}><b>{step.done ? "✓" : "○"}</b>{step.label}</li>)}</ol><small>{doneCount}/4 etapas de processo · sem nota de “beleza”.</small></div>
      </aside>

      <div className="manga-canvas-panel">
        <div className="manga-toolbar"><strong>Manga Construction · Head Study 01</strong><div><button onClick={undo} disabled={!strokes.length} type="button">Desfazer</button><button onClick={clear} disabled={!strokes.length} type="button">Limpar</button><button onClick={exportSvg} disabled={!strokes.length} type="button">Exportar SVG</button></div></div>
        <svg ref={svgRef} className="manga-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Canvas de construção manga">
          <rect width={WIDTH} height={HEIGHT} fill="#f8efd9" />
          <g className="manga-paper-grid" opacity=".22"><defs><pattern id="paperGrid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#b9a98e" strokeWidth="1" /></pattern></defs><rect width={WIDTH} height={HEIGHT} fill="url(#paperGrid)" /></g>
          <g className="manga-guides" fill="none" stroke="#b06a3f" strokeWidth="2" strokeDasharray="8 7" opacity=".58">
            {guides.skull ? <ellipse cx={guideGeometry.cx} cy={guideGeometry.cy} rx={guideGeometry.rx} ry={guideGeometry.ry} /> : null}
            {guides.center ? <path d={`M ${guideGeometry.centerX} 122 Q ${guideGeometry.centerX + (view === "three-quarter" ? 24 : 0)} 305 ${guideGeometry.centerX} 492`} /> : null}
            {guides.eyes ? <path d={`M 385 ${guideGeometry.eyeY} Q 540 ${guideGeometry.eyeY + (view === "three-quarter" ? 10 : 0)} 695 ${guideGeometry.eyeY}`} /> : null}
            {guides.jaw ? <path d={guideGeometry.jaw} /> : null}
            {guides.thirds ? <><path d="M 395 245 H 690" /><path d="M 405 355 H 680" /><path d="M 430 415 H 650" /></> : null}
          </g>
          {strokes.map((stroke, index) => <path key={index} d={pathFor(stroke.points)} fill="none" stroke={COLORS[stroke.pigment]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
          {draft ? <path d={pathFor(draft.points)} fill="none" stroke={COLORS[draft.pigment]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </svg>
        <footer className="manga-canvas-footer"><span>Guias são assistência, não resposta.</span><span>{strokes.length} traço(s) próprios · salvo neste dispositivo</span></footer>
      </div>
    </section>
  );
}
