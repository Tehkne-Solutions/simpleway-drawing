"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; pigment: "graphite" | "sanguine" | "ultramarine" };
type View = "front" | "three-quarter" | "profile";
type StructuralGuide = "skull" | "center" | "eyes" | "jaw";
type GuideUsage = Record<StructuralGuide, boolean>;
type EvidenceStatus = "idle" | "checking" | "saving" | "synced" | "offline" | "error";
type SavedMangaV2 = {
  version: 2;
  strokesByView: Record<View, Stroke[]>;
  guideUsageByView: Record<View, GuideUsage>;
};

const WIDTH = 1080;
const HEIGHT = 720;
const STORAGE_KEY = "swd.create.manga.v2";
const LEGACY_STORAGE_KEY = "swd.create.manga.v1";
const COLORS = { graphite: "#292722", sanguine: "#a44e2d", ultramarine: "#315b83" } as const;
const VIEWS: View[] = ["front", "three-quarter", "profile"];
const VIEW_LABELS: Record<View, string> = { front: "Frente", "three-quarter": "3/4", profile: "Perfil" };
const EMPTY_GUIDE_USAGE = (): GuideUsage => ({ skull: false, center: false, eyes: false, jaw: false });
const EMPTY_STROKES = (): Record<View, Stroke[]> => ({ front: [], "three-quarter": [], profile: [] });
const EMPTY_USAGE = (): Record<View, GuideUsage> => ({ front: EMPTY_GUIDE_USAGE(), "three-quarter": EMPTY_GUIDE_USAGE(), profile: EMPTY_GUIDE_USAGE() });

function pathFor(points: Point[]) {
  if (!points.length) return "";
  return points.reduce((path, point, index) => `${path}${index === 0 ? "M" : " L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`, "");
}

function pathLength(points: Point[]) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

function viewStats(strokes: Stroke[], usage: GuideUsage) {
  const meaningful = strokes.filter((stroke) => pathLength(stroke.points) >= 18);
  const all = meaningful.flatMap((stroke) => stroke.points);
  const width = all.length ? Math.max(...all.map((point) => point.x)) - Math.min(...all.map((point) => point.x)) : 0;
  const height = all.length ? Math.max(...all.map((point) => point.y)) - Math.min(...all.map((point) => point.y)) : 0;
  const length = meaningful.reduce((sum, stroke) => sum + pathLength(stroke.points), 0);
  const guidesUsed = (["skull", "center", "eyes", "jaw"] as StructuralGuide[]).filter((key) => usage[key]).length;
  return {
    strokes: meaningful.length,
    length,
    width,
    height,
    guidesUsed,
    ready: meaningful.length >= 6 && length >= 240 && width >= 80 && height >= 80 && guidesUsed === 4,
  };
}

function loadSaved(): SavedMangaV2 {
  const empty: SavedMangaV2 = { version: 2, strokesByView: EMPTY_STROKES(), guideUsageByView: EMPTY_USAGE() };
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      const saved = JSON.parse(current) as Partial<SavedMangaV2>;
      if (saved.version === 2 && saved.strokesByView && saved.guideUsageByView) {
        return {
          version: 2,
          strokesByView: {
            front: Array.isArray(saved.strokesByView.front) ? saved.strokesByView.front : [],
            "three-quarter": Array.isArray(saved.strokesByView["three-quarter"]) ? saved.strokesByView["three-quarter"] : [],
            profile: Array.isArray(saved.strokesByView.profile) ? saved.strokesByView.profile : [],
          },
          guideUsageByView: {
            front: { ...EMPTY_GUIDE_USAGE(), ...saved.guideUsageByView.front },
            "three-quarter": { ...EMPTY_GUIDE_USAGE(), ...saved.guideUsageByView["three-quarter"] },
            profile: { ...EMPTY_GUIDE_USAGE(), ...saved.guideUsageByView.profile },
          },
        };
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const strokes = JSON.parse(legacy) as unknown;
      if (Array.isArray(strokes)) empty.strokesByView.front = strokes as Stroke[];
    }
  } catch {}
  return empty;
}

export function MangaCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>("front");
  const [pigment, setPigment] = useState<keyof typeof COLORS>("graphite");
  const [guides, setGuides] = useState({ skull: true, center: true, eyes: true, jaw: true, thirds: false });
  const [strokesByView, setStrokesByView] = useState<Record<View, Stroke[]>>(EMPTY_STROKES);
  const [guideUsageByView, setGuideUsageByView] = useState<Record<View, GuideUsage>>(EMPTY_USAGE);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceStatus>("idle");
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadSaved();
    setStrokesByView(saved.strokesByView);
    setGuideUsageByView(saved.guideUsageByView);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: SavedMangaV2 = { version: 2, strokesByView, guideUsageByView };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [strokesByView, guideUsageByView, hydrated]);

  useEffect(() => {
    let disposed = false;
    const check = async () => {
      setEvidenceStatus("checking");
      try {
        const session = await fetch("/api/session/guest", { method: "POST" });
        if (!session.ok) throw new Error("SESSION_UNAVAILABLE");
        const response = await fetch("/api/studio/evidence", { cache: "no-store" });
        if (!response.ok) throw new Error("STUDIO_EVIDENCE_UNAVAILABLE");
        const snapshot = await response.json() as { completedMissionIds?: string[] };
        if (disposed) return;
        setEvidenceStatus(snapshot.completedMissionIds?.includes("manga") ? "synced" : "idle");
      } catch {
        if (!disposed) setEvidenceStatus("offline");
      }
    };
    void check();
    return () => { disposed = true; };
  }, []);

  const strokes = strokesByView[view];
  const guideGeometry = useMemo(() => {
    if (view === "profile") return { cx: 555, cy: 300, rx: 150, ry: 170, centerX: 615, eyeY: 300, jaw: "M 475 350 Q 560 500 655 372" };
    if (view === "three-quarter") return { cx: 540, cy: 300, rx: 164, ry: 175, centerX: 575, eyeY: 300, jaw: "M 410 350 Q 535 505 675 350" };
    return { cx: 540, cy: 300, rx: 170, ry: 178, centerX: 540, eyeY: 300, jaw: "M 405 350 Q 540 510 675 350" };
  }, [view]);

  const statsByView = useMemo(() => ({
    front: viewStats(strokesByView.front, guideUsageByView.front),
    "three-quarter": viewStats(strokesByView["three-quarter"], guideUsageByView["three-quarter"]),
    profile: viewStats(strokesByView.profile, guideUsageByView.profile),
  }), [strokesByView, guideUsageByView]);
  const missionReady = VIEWS.every((item) => statsByView[item].ready);

  function toPoint(event: React.PointerEvent<SVGSVGElement>): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
  }

  function markGuideUsage() {
    setGuideUsageByView((current) => ({
      ...current,
      [view]: {
        skull: current[view].skull || guides.skull,
        center: current[view].center || guides.center,
        eyes: current[view].eyes || guides.eyes,
        jaw: current[view].jaw || guides.jaw,
      },
    }));
  }

  function begin(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    markGuideUsage();
    setDraft({ points: [toPoint(event)], pigment });
  }

  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const point = toPoint(event);
    setDraft((current) => current ? { ...current, points: [...current.points, point] } : null);
  }

  function end() {
    setDraft((current) => {
      if (current && current.points.length > 1 && pathLength(current.points) >= 3) {
        setStrokesByView((items) => ({ ...items, [view]: [...items[view], current] }));
      }
      return null;
    });
  }

  function undo() { setStrokesByView((items) => ({ ...items, [view]: items[view].slice(0, -1) })); }
  function clear() {
    setStrokesByView((items) => ({ ...items, [view]: [] }));
    setGuideUsageByView((items) => ({ ...items, [view]: EMPTY_GUIDE_USAGE() }));
    if (evidenceStatus !== "synced") setEvidenceStatus("idle");
  }

  function exportSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}"><rect width="100%" height="100%" fill="#f8efd9"/>${strokes.map((stroke) => `<path d="${pathFor(stroke.points)}" fill="none" stroke="${COLORS[stroke.pigment]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `swd-manga-head-${view}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function registerEvidence() {
    if (!missionReady || evidenceStatus === "saving" || evidenceStatus === "synced") return;
    setEvidenceStatus("saving");
    setEvidenceMessage(null);
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("SESSION_UNAVAILABLE");
      const response = await fetch("/api/studio/evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ missionId: "manga", payload: { strokesByView, guideUsageByView } }),
      });
      const payload = await response.json() as { code?: string };
      if (!response.ok) throw new Error(payload.code ?? "STUDIO_EVIDENCE_FAILED");
      setEvidenceStatus("synced");
      setEvidenceMessage("Sigilo das Vistas registrado no Atlas.");
    } catch (error) {
      setEvidenceStatus("offline");
      setEvidenceMessage(error instanceof Error && error.message !== "SESSION_UNAVAILABLE" ? error.message : "Runtime autoritativo indisponível; seu estudo local permanece salvo.");
    }
  }

  return (
    <section className="manga-workbench">
      <aside className="manga-tools" aria-label="Ferramentas do Manga Canvas">
        <div className="manga-tool-group"><span>VISTAS · 3 ESTUDOS</span><div className="manga-segmented">{VIEWS.map((item) => <button key={item} className={view === item ? "is-active" : undefined} onClick={() => setView(item)} type="button"><b>{VIEW_LABELS[item]}</b><small>{statsByView[item].strokes}/6 traços · {statsByView[item].guidesUsed}/4 guias {statsByView[item].ready ? "✓" : ""}</small></button>)}</div></div>
        <div className="manga-tool-group"><span>GUIAS</span>{Object.entries(guides).map(([key, value]) => <label key={key}><input type="checkbox" checked={value} onChange={(event) => setGuides((current) => ({ ...current, [key]: event.target.checked }))} />{key === "skull" ? "Crânio" : key === "center" ? "Eixo central" : key === "eyes" ? "Linha dos olhos" : key === "jaw" ? "Mandíbula" : "Terços"}</label>)}</div>
        <div className="manga-tool-group"><span>PIGMENTO</span><div className="manga-pigments">{(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((item) => <button key={item} className={pigment === item ? "is-active" : undefined} style={{ "--pigment": COLORS[item] } as React.CSSProperties} onClick={() => setPigment(item)} type="button"><i />{item === "graphite" ? "Grafite" : item === "sanguine" ? "Sanguínea" : "Ultramar"}</button>)}</div></div>
        <div className={`manga-tool-group manga-mission ${missionReady ? "is-ready" : ""}`}><span>MISSÃO DE CROMA · HEAD VIEWS</span><strong>Construa a mesma cabeça em três vistas.</strong><ol>{VIEWS.map((item) => <li className={statsByView[item].ready ? "is-done" : ""} key={item}><b>{statsByView[item].ready ? "✓" : "○"}</b><span>{VIEW_LABELS[item]} · {statsByView[item].strokes}/6 traços · {statsByView[item].guidesUsed}/4 guias</span></li>)}</ol><small>As guias contam apenas quando estão ativas durante seus próprios traços. Nenhuma nota de “beleza”.</small><button className="manga-evidence-button" type="button" disabled={!missionReady || evidenceStatus === "saving" || evidenceStatus === "synced"} onClick={registerEvidence}>{evidenceStatus === "synced" ? "Evidence registrada ✓" : evidenceStatus === "saving" ? "Validando Evidence…" : missionReady ? "Registrar Evidence no Atlas" : "Complete as três vistas"}</button>{evidenceMessage ? <small className="manga-evidence-message">{evidenceMessage}</small> : null}{evidenceStatus === "offline" && !evidenceMessage ? <small>Modo local ativo · Evidence sincroniza no runtime completo.</small> : null}</div>
      </aside>

      <div className="manga-canvas-panel">
        <div className="manga-toolbar"><strong>Manga Construction · {VIEW_LABELS[view]} · {strokes.length} traço(s)</strong><div><button onClick={undo} disabled={!strokes.length} type="button">Desfazer</button><button onClick={clear} disabled={!strokes.length} type="button">Limpar vista</button><button onClick={exportSvg} disabled={!strokes.length} type="button">Exportar SVG</button></div></div>
        <svg ref={svgRef} className="manga-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label={`Canvas de construção manga · ${VIEW_LABELS[view]}`}>
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
        <footer className="manga-canvas-footer"><span>Vista atual: {VIEW_LABELS[view]} · guias são assistência, não resposta.</span><span>{statsByView[view].strokes} traço(s) significativos · estudo independente salvo</span></footer>
      </div>
    </section>
  );
}
