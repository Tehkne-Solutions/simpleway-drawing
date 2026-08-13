"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Resolution = 8 | 16 | 32;
type Tool = "pencil" | "eraser" | "fill" | "picker";
type Pixel = string | null;

const DISPLAY = 640;
const RESOLUTIONS: Resolution[] = [8, 16, 32];
const COLORS = ["#181715", "#f4ead7", "#f2b705", "#a44e2d", "#315b83", "#39745a", "#74567d", "#d98c3f"];
const STORAGE = "swd.create.pixel.tile.v1";

function empty(resolution: Resolution): Pixel[] { return Array.from({ length: resolution * resolution }, () => null); }
function indexOf(x: number, y: number, resolution: Resolution) { return y * resolution + x; }
function wrap(value: number, resolution: Resolution) { return ((value % resolution) + resolution) % resolution; }

export function TileLab() {
  const editorRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [resolution, setResolution] = useState<Resolution>(16);
  const [pixels, setPixels] = useState<Pixel[]>(() => empty(16));
  const [history, setHistory] = useState<Pixel[][]>([]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState(COLORS[0]!);
  const [brush, setBrush] = useState<1 | 2 | 3>(1);
  const [showGrid, setShowGrid] = useState(true);
  const [wrapPaint, setWrapPaint] = useState(true);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [previewChecks, setPreviewChecks] = useState(0);
  const [offsetChecks, setOffsetChecks] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE}.${resolution}`);
      if (!raw) { setPixels(empty(resolution)); return; }
      const saved = JSON.parse(raw) as { pixels?: Pixel[]; color?: string; wrapPaint?: boolean };
      setPixels(saved.pixels?.length === resolution * resolution ? saved.pixels : empty(resolution));
      if (saved.color) setColor(saved.color);
      if (typeof saved.wrapPaint === "boolean") setWrapPaint(saved.wrapPaint);
    } catch { setPixels(empty(resolution)); }
    setHistory([]); setOffsetX(0); setOffsetY(0);
  }, [resolution]);

  useEffect(() => {
    try { localStorage.setItem(`${STORAGE}.${resolution}`, JSON.stringify({ pixels, color, wrapPaint })); } catch {}
  }, [pixels, color, wrapPaint, resolution]);

  function drawTile(ctx: CanvasRenderingContext2D, x0: number, y0: number, size: number, checker: boolean) {
    const cell = size / resolution;
    for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
      const pixel = pixels[indexOf(x, y, resolution)];
      ctx.fillStyle = pixel ?? (checker ? ((x + y) % 2 ? "#e2d5bd" : "#f1e7d3") : "rgba(0,0,0,0)");
      if (pixel || checker) ctx.fillRect(x0 + x * cell, y0 + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  useEffect(() => {
    const canvas = editorRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = DISPLAY; canvas.height = DISPLAY; ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, DISPLAY, DISPLAY);
    drawTile(ctx, 0, 0, DISPLAY, true);
    if (showGrid) {
      const cell = DISPLAY / resolution; ctx.beginPath(); ctx.strokeStyle = "rgba(48,40,31,.25)"; ctx.lineWidth = 1;
      for (let n = 0; n <= resolution; n += 1) { const p = Math.round(n * cell) + .5; ctx.moveTo(p, 0); ctx.lineTo(p, DISPLAY); ctx.moveTo(0, p); ctx.lineTo(DISPLAY, p); }
      ctx.stroke();
    }
    ctx.strokeStyle = wrapPaint ? "#d49b13" : "#685d4d"; ctx.lineWidth = 5; ctx.strokeRect(2.5, 2.5, DISPLAY - 5, DISPLAY - 5);
  }, [pixels, resolution, showGrid, wrapPaint]);

  useEffect(() => {
    const canvas = previewRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = 360; const tile = 120; canvas.width = size; canvas.height = size; ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#d9ccb3"; ctx.fillRect(0, 0, size, size);
    const shiftX = (offsetX / resolution) * tile; const shiftY = (offsetY / resolution) * tile;
    for (let row = -1; row <= 3; row += 1) for (let col = -1; col <= 3; col += 1) drawTile(ctx, col * tile + shiftX, row * tile + shiftY, tile, true);
    ctx.strokeStyle = "rgba(32,28,23,.16)"; ctx.lineWidth = 1;
    for (let n = 0; n <= 3; n += 1) { ctx.beginPath(); ctx.moveTo(n * tile + (shiftX % tile), 0); ctx.lineTo(n * tile + (shiftX % tile), size); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, n * tile + (shiftY % tile)); ctx.lineTo(size, n * tile + (shiftY % tile)); ctx.stroke(); }
  }, [pixels, resolution, offsetX, offsetY]);

  function pushHistory() { setHistory((items) => [...items.slice(-29), pixels.slice()]); }
  function undo() { setHistory((items) => { const previous = items.at(-1); if (previous) setPixels(previous.slice()); return previous ? items.slice(0, -1) : items; }); }
  function toCell(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = editorRef.current!.getBoundingClientRect();
    return { x: Math.min(resolution - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * resolution))), y: Math.min(resolution - 1, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * resolution))) };
  }
  function paint(x: number, y: number, erase = false) {
    setPixels((current) => { const next = current.slice(); const half = Math.floor(brush / 2);
      for (let dy = 0; dy < brush; dy += 1) for (let dx = 0; dx < brush; dx += 1) {
        let px = x + dx - half, py = y + dy - half;
        if (wrapPaint) { px = wrap(px, resolution); py = wrap(py, resolution); }
        else if (px < 0 || py < 0 || px >= resolution || py >= resolution) continue;
        next[indexOf(px, py, resolution)] = erase ? null : color;
      }
      return next;
    });
  }
  function fill(x: number, y: number) {
    setPixels((current) => { const next = current.slice(); const target = current[indexOf(x, y, resolution)]; if (target === color) return current;
      const queue: Array<[number, number]> = [[x, y]]; const seen = new Set<number>();
      while (queue.length) { const [qx, qy] = queue.shift()!; const px = wrapPaint ? wrap(qx, resolution) : qx; const py = wrapPaint ? wrap(qy, resolution) : qy; if (px < 0 || py < 0 || px >= resolution || py >= resolution) continue; const i = indexOf(px, py, resolution); if (seen.has(i) || next[i] !== target) continue; seen.add(i); next[i] = color; queue.push([px+1,py],[px-1,py],[px,py+1],[px,py-1]); }
      return next;
    });
  }
  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = toCell(event);
    if (tool === "picker") { const picked = pixels[indexOf(x, y, resolution)]; if (picked) setColor(picked); return; }
    pushHistory(); if (tool === "fill") { fill(x, y); return; }
    drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); paint(x, y, tool === "eraser");
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const { x, y } = toCell(event); paint(x, y, tool === "eraser"); }
  function end() { drawing.current = false; }

  function exportCanvas(scale: number, pattern: boolean) {
    const tileSize = resolution * scale; const canvas = document.createElement("canvas"); canvas.width = pattern ? tileSize * 3 : tileSize; canvas.height = pattern ? tileSize * 3 : tileSize; const ctx = canvas.getContext("2d")!; ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < (pattern ? 3 : 1); row += 1) for (let col = 0; col < (pattern ? 3 : 1); col += 1) {
      for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) { const pixel = pixels[indexOf(x,y,resolution)]; if (!pixel) continue; ctx.fillStyle = pixel; ctx.fillRect(col * tileSize + x * scale, row * tileSize + y * scale, scale, scale); }
    }
    const link = document.createElement("a"); link.download = pattern ? `swd-pattern-${resolution}x${resolution}.png` : `swd-tile-${resolution}x${resolution}.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }

  const metrics = useMemo(() => {
    const painted = pixels.filter(Boolean).length; const used = new Set(pixels.filter(Boolean)).size;
    const edges = [pixels.slice(0,resolution).some(Boolean), pixels.slice(-resolution).some(Boolean), Array.from({length:resolution},(_,y)=>pixels[indexOf(0,y,resolution)]).some(Boolean), Array.from({length:resolution},(_,y)=>pixels[indexOf(resolution-1,y,resolution)]).some(Boolean)].filter(Boolean).length;
    return { coverage: painted / pixels.length, used, edges };
  }, [pixels, resolution]);
  const missionReady = metrics.coverage >= .12 && metrics.coverage <= .82 && metrics.used >= 2 && metrics.used <= 6 && metrics.edges >= 3 && previewChecks > 0 && offsetChecks > 0;

  return <div className="tile-shell">
    <aside className="tile-tools">
      <section><p className="eyebrow">Tessela de Croma · Tile 01</p><h2>Faça a borda desaparecer.</h2><p>Desenhe um tile que continue quando repetido. Use o preview e desloque a repetição para caçar costuras.</p></section>
      <section className="tile-control"><span>Resolução</span><div>{RESOLUTIONS.map((r)=><button key={r} className={resolution===r?"is-active":""} onClick={()=>setResolution(r)}>{r}×{r}</button>)}</div></section>
      <section className="tile-control"><span>Ferramenta</span><div>{(["pencil","eraser","fill","picker"] as Tool[]).map((item)=><button key={item} className={tool===item?"is-active":""} onClick={()=>setTool(item)}>{item}</button>)}</div></section>
      <section className="tile-control"><span>Brush</span><div>{([1,2,3] as const).map((size)=><button key={size} className={brush===size?"is-active":""} onClick={()=>setBrush(size)}>{size}×{size}</button>)}</div></section>
      <section className="tile-palette"><span>Paleta Croma</span><div>{COLORS.map((item)=><button key={item} aria-label={`Cor ${item}`} className={color===item?"is-active":""} style={{background:item}} onClick={()=>setColor(item)} />)}</div></section>
      <section className="tile-control"><span>Continuidade</span><label><input type="checkbox" checked={wrapPaint} onChange={(e)=>setWrapPaint(e.target.checked)} /> Wrap Paint</label><label><input type="checkbox" checked={showGrid} onChange={(e)=>setShowGrid(e.target.checked)} /> Grid</label></section>
      <section className={`tile-mission ${missionReady?"is-ready":""}`}><strong>{missionReady?"Tessela validada":"Missão em andamento"}</strong><small>{Math.round(metrics.coverage*100)}% ocupação · {metrics.used} cores · {metrics.edges}/4 bordas</small><small>Preview {previewChecks?"✓":"○"} · Offset {offsetChecks?"✓":"○"}</small></section>
    </aside>

    <section className="tile-workbench">
      <div className="tile-editor-bar"><button onClick={undo} disabled={!history.length}>Desfazer</button><button onClick={()=>{pushHistory();setPixels(empty(resolution));}}>Limpar</button><button onClick={()=>exportCanvas(1,false)}>Tile PNG</button><button onClick={()=>exportCanvas(16,false)}>Tile 16×</button></div>
      <canvas ref={editorRef} className="tile-editor" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
    </section>

    <aside className="tile-preview-panel">
      <div><p className="eyebrow">Preview contínuo · 3×3</p><h3>Procure a costura, não o tile.</h3></div>
      <button className="tile-preview" onClick={()=>setPreviewChecks((n)=>n+1)} title="Clique após inspecionar a repetição"><canvas ref={previewRef} /></button>
      <div className="tile-offsets"><label>Offset X <input type="range" min="0" max={resolution-1} value={offsetX} onChange={(e)=>{setOffsetX(Number(e.target.value));setOffsetChecks((n)=>n+1);}} /></label><label>Offset Y <input type="range" min="0" max={resolution-1} value={offsetY} onChange={(e)=>{setOffsetY(Number(e.target.value));setOffsetChecks((n)=>n+1);}} /></label></div>
      <button onClick={()=>exportCanvas(8,true)}>Pattern Sheet 3×3</button>
      <p className="tile-note">Wrap Paint replica o brush que cruza uma borda no lado oposto. Offset muda onde a costura aparece sem alterar sua arte.</p>
    </aside>
  </div>;
}
