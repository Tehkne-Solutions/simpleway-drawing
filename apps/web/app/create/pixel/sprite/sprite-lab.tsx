"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Resolution = 16 | 32;
type Tool = "pencil" | "eraser" | "picker";
type BrushSize = 1 | 2;
type Pixel = string | null;
type Frame = Pixel[];

type SavedSpriteLab = {
  frames: Frame[];
  activeColor?: string;
  brushSize?: BrushSize;
  symmetry?: boolean;
  onionSkin?: boolean;
  onionUsed?: boolean;
  previewPlayed?: boolean;
  showGrid?: boolean;
  fps?: number;
};

const DISPLAY = 640;
const PREVIEW = 176;
const MAX_FRAMES = 8;
const STORAGE_PREFIX = "swd.create.pixel.sprite.v1";
const COLORS = ["#181715", "#f4ead7", "#f2b705", "#a44e2d", "#315b83", "#39745a", "#74567d", "#d98c3f"] as const;

function emptyFrame(resolution: Resolution): Frame {
  return Array.from({ length: resolution * resolution }, () => null);
}

function defaultFrames(resolution: Resolution): Frame[] {
  return Array.from({ length: 4 }, () => emptyFrame(resolution));
}

function storageKey(resolution: Resolution) {
  return `${STORAGE_PREFIX}.${resolution}`;
}

function indexOfPixel(x: number, y: number, resolution: Resolution) {
  return y * resolution + x;
}

function inBounds(x: number, y: number, resolution: Resolution) {
  return x >= 0 && y >= 0 && x < resolution && y < resolution;
}

export function SpriteLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [resolution, setResolution] = useState<Resolution>(16);
  const [loadedResolution, setLoadedResolution] = useState<Resolution | null>(null);
  const [frames, setFrames] = useState<Frame[]>(() => defaultFrames(16));
  const [activeFrame, setActiveFrame] = useState(0);
  const [history, setHistory] = useState<Frame[][]>([]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [brushSize, setBrushSize] = useState<BrushSize>(1);
  const [activeColor, setActiveColor] = useState<string>(COLORS[0]);
  const [showGrid, setShowGrid] = useState(true);
  const [symmetry, setSymmetry] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [onionUsed, setOnionUsed] = useState(false);
  const [previewPlayed, setPreviewPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(4);
  const [previewFrame, setPreviewFrame] = useState(0);

  useEffect(() => {
    setLoadedResolution(null);
    setHistory([]);
    setActiveFrame(0);
    try {
      const raw = window.localStorage.getItem(storageKey(resolution));
      if (!raw) {
        setFrames(defaultFrames(resolution));
        setLoadedResolution(resolution);
        return;
      }
      const saved = JSON.parse(raw) as SavedSpriteLab;
      const validFrames = Array.isArray(saved.frames)
        ? saved.frames.filter((frame) => Array.isArray(frame) && frame.length === resolution * resolution).slice(0, MAX_FRAMES)
        : [];
      setFrames(validFrames.length >= 2 ? validFrames : defaultFrames(resolution));
      if (saved.activeColor) setActiveColor(saved.activeColor);
      if (saved.brushSize === 1 || saved.brushSize === 2) setBrushSize(saved.brushSize);
      if (typeof saved.symmetry === "boolean") setSymmetry(saved.symmetry);
      if (typeof saved.onionSkin === "boolean") setOnionSkin(saved.onionSkin);
      if (typeof saved.onionUsed === "boolean") setOnionUsed(saved.onionUsed);
      if (typeof saved.previewPlayed === "boolean") setPreviewPlayed(saved.previewPlayed);
      if (typeof saved.showGrid === "boolean") setShowGrid(saved.showGrid);
      if (typeof saved.fps === "number" && [2, 4, 6, 8].includes(saved.fps)) setFps(saved.fps);
    } catch {
      setFrames(defaultFrames(resolution));
    }
    setLoadedResolution(resolution);
  }, [resolution]);

  useEffect(() => {
    if (loadedResolution !== resolution) return;
    try {
      const saved: SavedSpriteLab = { frames, activeColor, brushSize, symmetry, onionSkin, onionUsed, previewPlayed, showGrid, fps };
      window.localStorage.setItem(storageKey(resolution), JSON.stringify(saved));
    } catch {}
  }, [frames, activeColor, brushSize, symmetry, onionSkin, onionUsed, previewPlayed, showGrid, fps, resolution, loadedResolution]);

  useEffect(() => {
    if (!playing) {
      setPreviewFrame(Math.min(activeFrame, Math.max(0, frames.length - 1)));
      return;
    }
    setPreviewPlayed(true);
    const timer = window.setInterval(() => setPreviewFrame((frame) => (frame + 1) % frames.length), Math.max(80, Math.round(1000 / fps)));
    return () => window.clearInterval(timer);
  }, [playing, fps, frames.length, activeFrame]);

  function paintFrame(context: CanvasRenderingContext2D, frame: Frame, cell: number, alpha = 1) {
    context.globalAlpha = alpha;
    frame.forEach((color, index) => {
      if (!color) return;
      const x = index % resolution;
      const y = Math.floor(index / resolution);
      context.fillStyle = color;
      context.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
    });
    context.globalAlpha = 1;
  }

  function drawCanvas(canvas: HTMLCanvasElement, size: number, frameIndex: number, grid: boolean, onion: boolean) {
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = size;
    canvas.height = size;
    context.imageSmoothingEnabled = false;
    const cell = size / resolution;
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        context.fillStyle = (x + y) % 2 === 0 ? "#f3ead8" : "#e5d8c0";
        context.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
    if (onion && frameIndex > 0) {
      const previous = frames[frameIndex - 1];
      if (previous) paintFrame(context, previous, cell, 0.2);
    }
    const frame = frames[frameIndex];
    if (frame) paintFrame(context, frame, cell);
    if (grid) {
      context.beginPath();
      context.strokeStyle = "rgba(52,44,34,.25)";
      context.lineWidth = 1;
      for (let line = 0; line <= resolution; line += 1) {
        const position = Math.round(line * cell) + 0.5;
        context.moveTo(position, 0); context.lineTo(position, size);
        context.moveTo(0, position); context.lineTo(size, position);
      }
      context.stroke();
    }
    if (symmetry && grid) {
      context.beginPath();
      context.strokeStyle = "rgba(242,183,5,.85)";
      context.lineWidth = 2;
      context.setLineDash([6, 5]);
      context.moveTo(size / 2, 0); context.lineTo(size / 2, size);
      context.stroke();
      context.setLineDash([]);
    }
  }

  useEffect(() => {
    if (canvasRef.current) drawCanvas(canvasRef.current, DISPLAY, activeFrame, showGrid, onionSkin);
    if (previewRef.current) drawCanvas(previewRef.current, PREVIEW, previewFrame, false, false);
  }, [frames, activeFrame, previewFrame, resolution, showGrid, onionSkin, symmetry]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      const key = event.key.toLowerCase();
      if (key === "p") setTool("pencil");
      else if (key === "e") setTool("eraser");
      else if (key === "i") setTool("picker");
      else if (key === "o") toggleOnion();
      else if (key === " ") { event.preventDefault(); setPlaying((value) => !value); }
      else if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function cloneFrames(source: Frame[] = frames) {
    return source.map((frame) => frame.slice());
  }

  function pushHistory() {
    setHistory((items) => [...items.slice(-29), cloneFrames()]);
  }

  function undo() {
    setHistory((items) => {
      const previous = items[items.length - 1];
      if (!previous) return items;
      setFrames(cloneFrames(previous));
      setActiveFrame((frame) => Math.min(frame, previous.length - 1));
      return items.slice(0, -1);
    });
  }

  function toCell(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(resolution - 1, Math.floor(((event.clientX - rect.left) / rect.width) * resolution))),
      y: Math.max(0, Math.min(resolution - 1, Math.floor(((event.clientY - rect.top) / rect.height) * resolution))),
    };
  }

  function applyBrush(x: number, y: number, erase = false) {
    setFrames((current) => {
      const next = cloneFrames(current);
      const frame = next[activeFrame];
      if (!frame) return current;
      const paint = (originX: number, originY: number) => {
        for (let dy = 0; dy < brushSize; dy += 1) for (let dx = 0; dx < brushSize; dx += 1) {
          const px = originX + dx;
          const py = originY + dy;
          if (inBounds(px, py, resolution)) frame[indexOfPixel(px, py, resolution)] = erase ? null : activeColor;
        }
      };
      paint(x, y);
      if (symmetry) paint(resolution - 1 - x, y);
      return next;
    });
  }

  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = toCell(event);
    const frame = frames[activeFrame];
    if (!frame) return;
    if (tool === "picker") {
      const color = frame[indexOfPixel(point.x, point.y, resolution)];
      if (color) setActiveColor(color);
      return;
    }
    pushHistory();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    applyBrush(point.x, point.y, tool === "eraser");
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || tool === "picker") return;
    const point = toCell(event);
    applyBrush(point.x, point.y, tool === "eraser");
  }

  function end() { drawingRef.current = false; }

  function toggleOnion() {
    setOnionSkin((value) => {
      const next = !value;
      if (next) setOnionUsed(true);
      return next;
    });
  }

  function addFrame(copyCurrent: boolean) {
    if (frames.length >= MAX_FRAMES) return;
    pushHistory();
    const source = copyCurrent ? frames[activeFrame]?.slice() ?? emptyFrame(resolution) : emptyFrame(resolution);
    const next = [...frames.slice(0, activeFrame + 1), source, ...frames.slice(activeFrame + 1)];
    setFrames(next);
    setActiveFrame(activeFrame + 1);
  }

  function deleteFrame() {
    if (frames.length <= 2) return;
    pushHistory();
    const next = frames.filter((_, index) => index !== activeFrame);
    setFrames(next);
    setActiveFrame(Math.max(0, Math.min(activeFrame, next.length - 1)));
  }

  function clearFrame() {
    pushHistory();
    setFrames((current) => current.map((frame, index) => index === activeFrame ? emptyFrame(resolution) : frame));
  }

  function exportSheet(multiplier: 1 | 16) {
    const canvas = document.createElement("canvas");
    canvas.width = resolution * frames.length * multiplier;
    canvas.height = resolution * multiplier;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    frames.forEach((frame, frameIndex) => frame.forEach((color, pixelIndex) => {
      if (!color) return;
      const x = pixelIndex % resolution;
      const y = Math.floor(pixelIndex / resolution);
      context.fillStyle = color;
      context.fillRect((frameIndex * resolution + x) * multiplier, y * multiplier, multiplier, multiplier);
    }));
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `swd-sprite-${resolution}x${resolution}-${frames.length}f-${multiplier === 1 ? "native" : "16x"}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  const stats = useMemo(() => {
    const frameCounts = frames.map((frame) => frame.filter(Boolean).length);
    const nonEmptyFrames = frameCounts.filter((count) => count > 0).length;
    const hashes = frames.filter((_, index) => frameCounts[index]! > 0).map((frame) => frame.map((pixel) => pixel ?? "_").join("|"));
    const distinctFrames = new Set(hashes).size;
    const colors = new Set<string>();
    let painted = 0;
    frames.forEach((frame) => frame.forEach((pixel) => { if (pixel) { colors.add(pixel); painted += 1; } }));
    return { frameCounts, nonEmptyFrames, distinctFrames, colors: colors.size, painted };
  }, [frames]);

  const mission = [
    { label: "Planeje pelo menos 4 frames", done: frames.length >= 4 },
    { label: "Desenhe em 3 ou mais frames", done: stats.nonEmptyFrames >= 3 },
    { label: "Crie 3 poses realmente diferentes", done: stats.distinctFrames >= 3 },
    { label: "Use de 2 a 5 cores", done: stats.colors >= 2 && stats.colors <= 5 },
    { label: "Use onion skin e assista ao playback", done: onionUsed && previewPlayed },
  ];
  const doneCount = mission.filter((step) => step.done).length;

  return (
    <section className="sprite-workbench">
      <aside className="sprite-tools">
        <section className="sprite-mission">
          <span>MISSÃO DE CROMA · SPRITE 01</span>
          <strong>Pulso de Croma · Idle 4F</strong>
          <p>Crie quatro poses simples: neutro, subida, pico e retorno. Busque leitura do movimento antes de detalhe.</p>
          <ol>{mission.map((step) => <li className={step.done ? "is-done" : ""} key={step.label}><b>{step.done ? "✓" : "○"}</b>{step.label}</li>)}</ol>
          <small>{doneCount}/5 regras de processo · {stats.distinctFrames} pose(s) distintas.</small>
        </section>

        <section className="sprite-tool-group"><span>RESOLUÇÃO</span><div className="sprite-segmented"><button className={resolution === 16 ? "is-active" : ""} onClick={() => setResolution(16)}>16×16</button><button className={resolution === 32 ? "is-active" : ""} onClick={() => setResolution(32)}>32×32</button></div></section>
        <section className="sprite-tool-group"><span>FERRAMENTA</span><div className="sprite-segmented three"><button className={tool === "pencil" ? "is-active" : ""} onClick={() => setTool("pencil")}>✎ P</button><button className={tool === "eraser" ? "is-active" : ""} onClick={() => setTool("eraser")}>⌫ E</button><button className={tool === "picker" ? "is-active" : ""} onClick={() => setTool("picker")}>◎ I</button></div></section>
        <section className="sprite-tool-group"><span>BLOCO</span><div className="sprite-segmented"><button className={brushSize === 1 ? "is-active" : ""} onClick={() => setBrushSize(1)}>1×1</button><button className={brushSize === 2 ? "is-active" : ""} onClick={() => setBrushSize(2)}>2×2</button></div></section>
        <section className="sprite-tool-group"><span>PALETA CROMA</span><div className="sprite-palette">{COLORS.map((color) => <button key={color} aria-label={`Cor ${color}`} className={activeColor === color ? "is-active" : ""} style={{ backgroundColor: color }} onClick={() => { setActiveColor(color); setTool("pencil"); }} />)}</div></section>
        <section className="sprite-tool-group sprite-switches"><span>ASSISTÊNCIAS</span><label><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />Grid</label><label><input type="checkbox" checked={onionSkin} onChange={toggleOnion} />Onion skin <kbd>O</kbd></label><label><input type="checkbox" checked={symmetry} onChange={(event) => setSymmetry(event.target.checked)} />Espelho</label></section>
      </aside>

      <div className="sprite-stage">
        <div className="sprite-toolbar"><div><strong>Sprite Lab · {resolution}×{resolution}</strong><span>Frame {activeFrame + 1}/{frames.length}</span></div><div><button onClick={undo} disabled={!history.length}>Desfazer</button><button onClick={() => addFrame(false)} disabled={frames.length >= MAX_FRAMES}>+ Frame</button><button onClick={() => addFrame(true)} disabled={frames.length >= MAX_FRAMES}>Duplicar</button><button onClick={deleteFrame} disabled={frames.length <= 2}>Excluir</button><button onClick={clearFrame} disabled={!stats.frameCounts[activeFrame]}>Limpar</button></div></div>

        <div className="sprite-frame-strip" aria-label="Frames da animação">{frames.map((_, index) => <button key={index} className={activeFrame === index ? "is-active" : ""} onClick={() => { setActiveFrame(index); setPlaying(false); }}><span>F{String(index + 1).padStart(2, "0")}</span><b>{stats.frameCounts[index] ?? 0}px</b></button>)}</div>

        <div className="sprite-canvas-area">
          <div className="sprite-canvas-wrap"><canvas ref={canvasRef} className="sprite-canvas" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} aria-label={`Editor de sprite frame ${activeFrame + 1}`} /></div>
          <aside className="sprite-preview-panel"><span>PLAYBACK</span><div className="sprite-preview-frame"><canvas ref={previewRef} aria-label="Prévia animada do sprite" /></div><div className="sprite-play-controls"><button className={playing ? "is-active" : ""} onClick={() => setPlaying((value) => !value)}>{playing ? "Pausar" : "▶ Reproduzir"}</button><select value={fps} onChange={(event) => setFps(Number(event.target.value))} aria-label="Frames por segundo"><option value={2}>2 FPS</option><option value={4}>4 FPS</option><option value={6}>6 FPS</option><option value={8}>8 FPS</option></select></div><p>Leia o movimento em tamanho real. Se só funciona quando ampliado, simplifique as poses.</p><dl><div><dt>Frames</dt><dd>{frames.length}</dd></div><div><dt>Poses</dt><dd>{stats.distinctFrames}</dd></div><div><dt>Cores</dt><dd>{stats.colors}</dd></div></dl><button onClick={() => exportSheet(1)} disabled={!stats.painted}>Spritesheet PNG</button><button onClick={() => exportSheet(16)} disabled={!stats.painted}>Spritesheet 16×</button></aside>
        </div>

        <footer className="sprite-footer"><span>Key pose → spacing → leitura → detalhe.</span><span>Salvo automaticamente neste dispositivo · Space = playback.</span></footer>
      </div>
    </section>
  );
}
