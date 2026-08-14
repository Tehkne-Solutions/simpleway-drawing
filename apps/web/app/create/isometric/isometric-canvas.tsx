"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Tool = "segment" | "free";
type Pigment = "graphite" | "sanguine" | "ultramarine";
type Stroke = { tool: Tool; pigment: Pigment; points: Point[]; snapped?: boolean };
type Axis = "axis30" | "vertical" | "axis150" | "off-axis";
type EvidenceStatus = "idle" | "checking" | "saving" | "synced" | "offline";

const WIDTH = 1200;
const HEIGHT = 720;
const GRID = 48;
const ISO_Y = GRID * Math.tan(Math.PI / 6);
const STORAGE_KEY = "swd.create.isometric.v1";
const PIGMENTS: Record<Pigment, string> = {
  graphite: "#292722",
  sanguine: "#a44e2d",
  ultramarine: "#315b83",
};

function snapToIso(point: Point): Point {
  const i = Math.round((point.x / GRID + point.y / ISO_Y) / 2);
  const j = Math.round((point.y / ISO_Y - point.x / GRID) / 2);
  return { x: GRID * (i - j), y: ISO_Y * (i + j) };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(points: Point[]) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distance(points[index - 1]!, points[index]!);
  return total;
}

function classifyAxis(a: Point, b: Point, tolerance = 8): Axis {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 1) return "off-axis";
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  angle = ((angle % 180) + 180) % 180;
  const delta = (target: number) => Math.min(Math.abs(angle - target), 180 - Math.abs(angle - target));
  if (delta(30) <= tolerance) return "axis30";
  if (delta(90) <= tolerance) return "vertical";
  if (delta(150) <= tolerance) return "axis150";
  return "off-axis";
}

export function IsometricCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tool, setTool] = useState<Tool>("segment");
  const [pigment, setPigment] = useState<Pigment>("graphite");
  const [snap, setSnap] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceStatus>("idle");
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as unknown;
        if (Array.isArray(saved)) setStrokes(saved as Stroke[]);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(strokes)); } catch {}
  }, [strokes, hydrated]);

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
        if (!disposed) setEvidenceStatus(snapshot.completedMissionIds?.includes("isometric") ? "synced" : "idle");
      } catch {
        if (!disposed) setEvidenceStatus("offline");
      }
    };
    void check();
    return () => { disposed = true; };
  }, []);

  const pattern = useMemo(() => {
    const h = ISO_Y * 2;
    return `M 0 ${ISO_Y} L ${GRID} 0 L ${GRID * 2} ${ISO_Y} L ${GRID} ${h} Z M ${GRID} 0 V ${h}`;
  }, []);

  const metrics = useMemo(() => {
    const aligned = strokes
      .filter((stroke) => stroke.tool === "segment" && stroke.points.length >= 2 && pathLength(stroke.points) >= 24)
      .map((stroke) => ({ stroke, axis: classifyAxis(stroke.points[0]!, stroke.points.at(-1)!) }))
      .filter((item) => item.axis !== "off-axis");
    const axis30 = aligned.filter((item) => item.axis === "axis30").length;
    const vertical = aligned.filter((item) => item.axis === "vertical").length;
    const axis150 = aligned.filter((item) => item.axis === "axis150").length;
    const snappedSegments = aligned.filter((item) => item.stroke.snapped === true).length;
    const allPoints = aligned.flatMap((item) => item.stroke.points);
    const width = allPoints.length ? Math.max(...allPoints.map((point) => point.x)) - Math.min(...allPoints.map((point) => point.x)) : 0;
    const height = allPoints.length ? Math.max(...allPoints.map((point) => point.y)) - Math.min(...allPoints.map((point) => point.y)) : 0;
    const ready = aligned.length >= 9 && axis30 >= 3 && vertical >= 3 && axis150 >= 3 && snappedSegments >= 6 && width >= 96 && height >= 60;
    return { aligned: aligned.length, axis30, vertical, axis150, snappedSegments, width, height, ready };
  }, [strokes]);

  const toPoint = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const point = { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
    if (!snap || tool === "free") return point;
    return snapToIso(point);
  };

  const begin = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    setDraft({ tool, pigment, points: [point, point], snapped: tool === "segment" && snap });
  };

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draft) return;
    const point = toPoint(event);
    setDraft((current) => {
      if (!current) return null;
      if (current.tool === "segment") return { ...current, points: [current.points[0]!, point] };
      const last = current.points.at(-1)!;
      return distance(last, point) < 3 ? current : { ...current, points: [...current.points, point] };
    });
  };

  const finish = () => {
    setDraft((current) => {
      if (current && current.points.length >= 2 && distance(current.points[0]!, current.points.at(-1)!) > 3) setStrokes((items) => [...items, current]);
      return null;
    });
  };

  const undo = () => setStrokes((items) => items.slice(0, -1));
  const clear = () => {
    if (strokes.length === 0 || window.confirm("Limpar todo o estudo isométrico?")) {
      setStrokes([]);
      if (evidenceStatus !== "synced") setEvidenceStatus("idle");
    }
  };

  const exportSvg = () => {
    const paths = strokes.map((stroke) => {
      const points = stroke.points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${PIGMENTS[stroke.pigment]}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join("");
    const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="100%" height="100%" fill="#fbf4e6"/>${paths}</svg>`;
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "simpleway-isometric-study.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  async function registerEvidence() {
    if (!metrics.ready || evidenceStatus === "saving" || evidenceStatus === "synced") return;
    setEvidenceStatus("saving");
    setEvidenceMessage(null);
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("SESSION_UNAVAILABLE");
      const response = await fetch("/api/studio/evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ missionId: "isometric", payload: { strokes: strokes.filter((stroke) => stroke.tool === "segment") } }),
      });
      const payload = await response.json() as { code?: string };
      if (!response.ok) throw new Error(payload.code ?? "STUDIO_EVIDENCE_FAILED");
      setEvidenceStatus("synced");
      setEvidenceMessage("Sigilo dos Eixos registrado no Atlas.");
    } catch (error) {
      setEvidenceStatus("offline");
      setEvidenceMessage(error instanceof Error && error.message !== "SESSION_UNAVAILABLE" ? error.message : "Runtime autoritativo indisponível; seu estudo local permanece salvo.");
    }
  }

  const renderStroke = (stroke: Stroke, key: string) => {
    const axis = stroke.tool === "segment" && stroke.points.length >= 2 ? classifyAxis(stroke.points[0]!, stroke.points.at(-1)!) : "off-axis";
    return <polyline
      key={key}
      points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
      fill="none"
      stroke={PIGMENTS[stroke.pigment]}
      strokeWidth={stroke.tool === "free" ? 4 : axis === "off-axis" ? 2.4 : 3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={stroke.tool === "segment" && axis === "off-axis" ? .58 : 1}
    />;
  };

  return (
    <section className="iso-game-shell">
      <aside className={`iso-mission-panel ${metrics.ready ? "is-ready" : ""}`}>
        <p className="iso-kicker">Missão de Croma · AXIS 01</p>
        <h2>Construa um volume usando os três eixos.</h2>
        <p>Segmentos só contam quando seguem 30°, vertical ou 150°. Traço livre serve para estudar; não aumenta o progresso estrutural.</p>
        <ol>
          <li className={metrics.axis30 >= 3 ? "is-done" : ""}><span>↘</span><div><strong>Eixo 30°</strong><small>{metrics.axis30}/3 segmentos alinhados</small></div></li>
          <li className={metrics.vertical >= 3 ? "is-done" : ""}><span>↕</span><div><strong>Eixo vertical</strong><small>{metrics.vertical}/3 segmentos alinhados</small></div></li>
          <li className={metrics.axis150 >= 3 ? "is-done" : ""}><span>↙</span><div><strong>Eixo 150°</strong><small>{metrics.axis150}/3 segmentos alinhados</small></div></li>
          <li className={metrics.snappedSegments >= 6 ? "is-done" : ""}><span>S</span><div><strong>Decisão com Snap</strong><small>{metrics.snappedSegments}/6 segmentos construídos com snap</small></div></li>
        </ol>
        <div className="iso-progress"><span><i style={{ width: `${Math.min(100, metrics.aligned / 9 * 100)}%` }} /></span><b>{Math.min(metrics.aligned, 9)}/9 segmentos válidos · área {Math.round(metrics.width)}×{Math.round(metrics.height)}</b></div>
        <button className="iso-evidence-button" type="button" disabled={!metrics.ready || evidenceStatus === "saving" || evidenceStatus === "synced"} onClick={registerEvidence}>{evidenceStatus === "synced" ? "Evidence registrada ✓" : evidenceStatus === "saving" ? "Validando Evidence…" : metrics.ready ? "Registrar Evidence no Atlas" : "Complete os três eixos"}</button>
        {evidenceMessage ? <small className="iso-evidence-message">{evidenceMessage}</small> : evidenceStatus === "offline" ? <small className="iso-evidence-message">Modo local ativo · Evidence sincroniza no runtime completo.</small> : null}
        <blockquote>“Prima osserva. Poi crea.” <small>— Codex Croma</small></blockquote>
      </aside>

      <div className="iso-workbench">
        <div className="iso-toolbar" aria-label="Ferramentas do canvas isométrico">
          <div className="iso-tool-group">
            <button type="button" className={tool === "segment" ? "is-active" : ""} onClick={() => setTool("segment")}>Segmento</button>
            <button type="button" className={tool === "free" ? "is-active" : ""} onClick={() => setTool("free")}>Traço livre</button>
          </div>
          <div className="iso-tool-group pigment-tools" aria-label="Pigmento">
            {(Object.keys(PIGMENTS) as Pigment[]).map((key) => <button key={key} type="button" className={pigment === key ? "is-active" : ""} onClick={() => setPigment(key)} aria-label={`Pigmento ${key}`}><span style={{ background: PIGMENTS[key] }} /></button>)}
          </div>
          <div className="iso-tool-group">
            <button type="button" className={snap ? "is-active" : ""} onClick={() => setSnap((value) => !value)}>Snap</button>
            <button type="button" className={gridVisible ? "is-active" : ""} onClick={() => setGridVisible((value) => !value)}>Grade</button>
          </div>
          <div className="iso-tool-group iso-tool-actions">
            <button type="button" onClick={undo} disabled={strokes.length === 0}>Desfazer</button>
            <button type="button" onClick={clear} disabled={strokes.length === 0}>Limpar</button>
            <button type="button" onClick={exportSvg} disabled={strokes.length === 0}>Exportar SVG</button>
          </div>
        </div>

        <div className="iso-canvas-frame">
          <svg
            ref={svgRef}
            className="iso-canvas"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Canvas de treino isométrico"
            onPointerDown={begin}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
          >
            <defs>
              <pattern id="iso-grid-v13" width={GRID * 2} height={ISO_Y * 2} patternUnits="userSpaceOnUse">
                <path d={pattern} fill="none" stroke="#a9987c" strokeWidth="1" opacity=".34" />
              </pattern>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="#fbf4e6" />
            {gridVisible ? <rect width={WIDTH} height={HEIGHT} fill="url(#iso-grid-v13)" /> : null}
            {strokes.map((stroke, index) => renderStroke(stroke, `stroke-${index}`))}
            {draft ? renderStroke(draft, "draft") : null}
          </svg>
          <div className="iso-canvas-caption"><span>ISOMETRIC STUDY PLATE · SWD · 30° {metrics.axis30} · 90° {metrics.vertical} · 150° {metrics.axis150}</span><b>{snap && tool === "segment" ? "SNAP 30° ATIVO" : "MODO LIVRE"}</b></div>
        </div>
      </div>
    </section>
  );
}
