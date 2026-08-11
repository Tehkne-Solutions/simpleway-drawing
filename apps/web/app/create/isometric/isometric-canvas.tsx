"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Tool = "segment" | "free";
type Pigment = "graphite" | "sanguine" | "ultramarine";
type Stroke = { tool: Tool; pigment: Pigment; points: Point[] };

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

export function IsometricCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tool, setTool] = useState<Tool>("segment");
  const [pigment, setPigment] = useState<Pigment>("graphite");
  const [snap, setSnap] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
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

  const pattern = useMemo(() => {
    const h = ISO_Y * 2;
    return `M 0 ${ISO_Y} L ${GRID} 0 L ${GRID * 2} ${ISO_Y} L ${GRID} ${h} Z M ${GRID} 0 V ${h}`;
  }, []);

  const toPoint = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
    if (!snap || tool === "free") return point;
    return snapToIso(point);
  };

  const begin = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    setDraft({ tool, pigment, points: [point, point] });
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
      if (current && current.points.length >= 2 && distance(current.points[0]!, current.points.at(-1)!) > 3) {
        setStrokes((items) => [...items, current]);
      }
      return null;
    });
  };

  const undo = () => setStrokes((items) => items.slice(0, -1));
  const clear = () => {
    if (strokes.length === 0 || window.confirm("Limpar todo o estudo isométrico?")) setStrokes([]);
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

  const structuralMarks = strokes.filter((stroke) => stroke.tool === "segment").length;
  const missionStep = structuralMarks >= 9 ? 3 : structuralMarks >= 6 ? 2 : structuralMarks >= 3 ? 1 : 0;

  const renderStroke = (stroke: Stroke, key: string) => (
    <polyline
      key={key}
      points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
      fill="none"
      stroke={PIGMENTS[stroke.pigment]}
      strokeWidth={stroke.tool === "free" ? 4 : 3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  return (
    <section className="iso-game-shell">
      <aside className="iso-mission-panel">
        <p className="iso-kicker">Missão de Croma · 001</p>
        <h2>Construa um cubo no espaço.</h2>
        <p>Use a grade para pensar em três direções. Aqui não avaliamos beleza: treinamos decisão espacial.</p>
        <ol>
          <li className={missionStep >= 1 ? "is-done" : ""}><span>01</span><div><strong>Base</strong><small>Faça pelo menos 3 arestas.</small></div></li>
          <li className={missionStep >= 2 ? "is-done" : ""}><span>02</span><div><strong>Elevação</strong><small>Suba as arestas verticais.</small></div></li>
          <li className={missionStep >= 3 ? "is-done" : ""}><span>03</span><div><strong>Fechamento</strong><small>Complete o volume.</small></div></li>
        </ol>
        <div className="iso-progress"><span><i style={{ width: `${Math.min(100, structuralMarks / 9 * 100)}%` }} /></span><b>{Math.min(structuralMarks, 9)}/9 traços estruturais</b></div>
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
          <div className="iso-canvas-caption"><span>ISOMETRIC STUDY PLATE · SWD</span><b>{snap && tool === "segment" ? "SNAP 30° ATIVO" : "MODO LIVRE"}</b></div>
        </div>
      </div>
    </section>
  );
}
