"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Resolution = 16 | 32 | 64;
type Tool = "pencil" | "eraser" | "fill" | "picker";
type BrushSize = 1 | 2 | 4;
type Pixel = string | null;

type SavedPixelStudio = {
  pixels: Pixel[];
  activeColor?: string;
  palette?: string;
  brushSize?: BrushSize;
  symmetry?: boolean;
  showGrid?: boolean;
};

const DISPLAY = 768;
const PREVIEW = 144;
const RESOLUTIONS: Resolution[] = [16, 32, 64];
const STORAGE_PREFIX = "swd.create.pixel.v1";

const PALETTES = {
  croma: {
    name: "Croma",
    colors: ["#181715", "#f4ead7", "#f2b705", "#a44e2d", "#315b83", "#39745a", "#74567d", "#d98c3f"],
  },
  atelier: {
    name: "Atelier",
    colors: ["#201d19", "#554536", "#8a6848", "#c39a66", "#ead9b8", "#9e4a31", "#2e556f", "#486a55"],
  },
  gameboy: {
    name: "4 tons",
    colors: ["#172116", "#3f5b3a", "#8aa06e", "#d7dfaa"],
  },
  ocean: {
    name: "Oceano",
    colors: ["#17222b", "#244b64", "#3d7892", "#83b5b0", "#efe2bd", "#cc704b", "#7d405a", "#e5a54d"],
  },
} as const;

type PaletteKey = keyof typeof PALETTES;

function emptyPixels(resolution: Resolution): Pixel[] {
  return Array.from({ length: resolution * resolution }, () => null);
}

function storageKey(resolution: Resolution) {
  return `${STORAGE_PREFIX}.${resolution}`;
}

function pixelIndex(x: number, y: number, resolution: Resolution) {
  return y * resolution + x;
}

function inBounds(x: number, y: number, resolution: Resolution) {
  return x >= 0 && y >= 0 && x < resolution && y < resolution;
}

export function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [resolution, setResolution] = useState<Resolution>(16);
  const [loadedResolution, setLoadedResolution] = useState<Resolution | null>(null);
  const [pixels, setPixels] = useState<Pixel[]>(() => emptyPixels(16));
  const [history, setHistory] = useState<Pixel[][]>([]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [brushSize, setBrushSize] = useState<BrushSize>(1);
  const [palette, setPalette] = useState<PaletteKey>("croma");
  const [activeColor, setActiveColor] = useState<string>(PALETTES.croma.colors[0]);
  const [showGrid, setShowGrid] = useState(true);
  const [symmetry, setSymmetry] = useState(false);

  useEffect(() => {
    setLoadedResolution(null);
    setHistory([]);
    try {
      const raw = window.localStorage.getItem(storageKey(resolution));
      if (!raw) {
        setPixels(emptyPixels(resolution));
        setLoadedResolution(resolution);
        return;
      }
      const saved = JSON.parse(raw) as SavedPixelStudio;
      const nextPixels = Array.isArray(saved.pixels) && saved.pixels.length === resolution * resolution
        ? saved.pixels
        : emptyPixels(resolution);
      setPixels(nextPixels);
      if (saved.activeColor) setActiveColor(saved.activeColor);
      if (saved.palette && saved.palette in PALETTES) setPalette(saved.palette as PaletteKey);
      if (saved.brushSize === 1 || saved.brushSize === 2 || saved.brushSize === 4) setBrushSize(saved.brushSize);
      if (typeof saved.symmetry === "boolean") setSymmetry(saved.symmetry);
      if (typeof saved.showGrid === "boolean") setShowGrid(saved.showGrid);
    } catch {
      setPixels(emptyPixels(resolution));
    }
    setLoadedResolution(resolution);
  }, [resolution]);

  useEffect(() => {
    if (loadedResolution !== resolution) return;
    try {
      const payload: SavedPixelStudio = { pixels, activeColor, palette, brushSize, symmetry, showGrid };
      window.localStorage.setItem(storageKey(resolution), JSON.stringify(payload));
    } catch {}
  }, [pixels, activeColor, palette, brushSize, symmetry, showGrid, resolution, loadedResolution]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (key === "p") setTool("pencil");
      else if (key === "e") setTool("eraser");
      else if (key === "f") setTool("fill");
      else if (key === "i") setTool("picker");
      else if (key === "g") setShowGrid((value) => !value);
      else if (key === "x") setSymmetry((value) => !value);
      else if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function drawSurface(canvas: HTMLCanvasElement, size: number, withGrid: boolean) {
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = size;
    canvas.height = size;
    context.imageSmoothingEnabled = false;
    const cell = size / resolution;
    context.clearRect(0, 0, size, size);

    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const index = pixelIndex(x, y, resolution);
        const color = pixels[index];
        context.fillStyle = color ?? ((x + y) % 2 === 0 ? "#f3ead8" : "#e6d9c1");
        context.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }

    if (withGrid) {
      context.beginPath();
      context.strokeStyle = resolution === 64 ? "rgba(54,45,34,.16)" : "rgba(54,45,34,.28)";
      context.lineWidth = 1;
      for (let line = 0; line <= resolution; line += 1) {
        const position = Math.round(line * cell) + 0.5;
        context.moveTo(position, 0);
        context.lineTo(position, size);
        context.moveTo(0, position);
        context.lineTo(size, position);
      }
      context.stroke();
    }

    if (symmetry && withGrid) {
      context.beginPath();
      context.strokeStyle = "rgba(242,183,5,.78)";
      context.lineWidth = 2;
      context.setLineDash([7, 5]);
      context.moveTo(size / 2, 0);
      context.lineTo(size / 2, size);
      context.stroke();
      context.setLineDash([]);
    }
  }

  useEffect(() => {
    if (canvasRef.current) drawSurface(canvasRef.current, DISPLAY, showGrid);
    if (previewRef.current) drawSurface(previewRef.current, PREVIEW, false);
  }, [pixels, resolution, showGrid, symmetry]);

  function pushHistory() {
    setHistory((items) => [...items.slice(-39), pixels.slice()]);
  }

  function undo() {
    setHistory((items) => {
      if (!items.length) return items;
      const previous = items[items.length - 1];
      if (!previous) return items;
      setPixels(previous.slice());
      return items.slice(0, -1);
    });
  }

  function clear() {
    pushHistory();
    setPixels(emptyPixels(resolution));
  }

  function toCell(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = Math.max(0, Math.min(resolution - 1, Math.floor(((event.clientX - rect.left) / rect.width) * resolution)));
    const y = Math.max(0, Math.min(resolution - 1, Math.floor(((event.clientY - rect.top) / rect.height) * resolution)));
    return { x, y };
  }

  function applyBrush(x: number, y: number, erase = false) {
    setPixels((current) => {
      const next = current.slice();
      const offset = Math.floor(brushSize / 2);
      const paint = (originX: number, originY: number) => {
        for (let dy = 0; dy < brushSize; dy += 1) {
          for (let dx = 0; dx < brushSize; dx += 1) {
            const px = originX + dx - offset;
            const py = originY + dy - offset;
            if (!inBounds(px, py, resolution)) continue;
            next[pixelIndex(px, py, resolution)] = erase ? null : activeColor;
          }
        }
      };
      paint(x, y);
      if (symmetry) paint(resolution - 1 - x, y);
      return next;
    });
  }

  function floodFill(startX: number, startY: number) {
    setPixels((current) => {
      const next = current.slice();
      const target = current[pixelIndex(startX, startY, resolution)];
      if (target === activeColor) return current;
      const queue: Array<[number, number]> = [[startX, startY]];
      const visited = new Set<number>();
      while (queue.length) {
        const [x, y] = queue.shift()!;
        if (!inBounds(x, y, resolution)) continue;
        const index = pixelIndex(x, y, resolution);
        if (visited.has(index) || next[index] !== target) continue;
        visited.add(index);
        next[index] = activeColor;
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      return next;
    });
  }

  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = toCell(event);
    if (tool === "picker") {
      const color = pixels[pixelIndex(point.x, point.y, resolution)];
      if (color) setActiveColor(color);
      return;
    }
    pushHistory();
    if (tool === "fill") {
      floodFill(point.x, point.y);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    applyBrush(point.x, point.y, tool === "eraser");
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || (tool !== "pencil" && tool !== "eraser")) return;
    const point = toCell(event);
    applyBrush(point.x, point.y, tool === "eraser");
  }

  function end() {
    drawingRef.current = false;
  }

  function exportPng(multiplier: 1 | 16) {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = resolution * multiplier;
    exportCanvas.height = resolution * multiplier;
    const context = exportCanvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    pixels.forEach((color, index) => {
      if (!color) return;
      const x = index % resolution;
      const y = Math.floor(index / resolution);
      context.fillStyle = color;
      context.fillRect(x * multiplier, y * multiplier, multiplier, multiplier);
    });
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `swd-pixel-${resolution}x${resolution}-${multiplier === 1 ? "native" : "16x"}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  const stats = useMemo(() => {
    const colors = new Set<string>();
    let painted = 0;
    let minX: number = resolution;
    let maxX = -1;
    let minY: number = resolution;
    let maxY = -1;
    pixels.forEach((color, index) => {
      if (!color) return;
      painted += 1;
      colors.add(color);
      const x = index % resolution;
      const y = Math.floor(index / resolution);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    return {
      painted,
      colors: colors.size,
      width: painted ? maxX - minX + 1 : 0,
      height: painted ? maxY - minY + 1 : 0,
    };
  }, [pixels, resolution]);

  const missionSteps = [
    { label: "Trabalhe em 16×16", done: resolution === 16 },
    { label: "Defina uma silhueta com 32+ pixels", done: stats.painted >= 32 },
    { label: "Use de 2 a 5 cores", done: stats.colors >= 2 && stats.colors <= 5 },
    { label: "Ocupação legível: ao menos 7×5 pixels", done: stats.width >= 7 && stats.height >= 5 },
  ];
  const doneCount = missionSteps.filter((step) => step.done).length;

  return (
    <section className="pixel-workbench">
      <aside className="pixel-tools" aria-label="Ferramentas do Pixel Studio">
        <div className="pixel-tool-group">
          <span>RESOLUÇÃO</span>
          <div className="pixel-segmented pixel-resolution">
            {RESOLUTIONS.map((item) => <button type="button" className={resolution === item ? "is-active" : ""} key={item} onClick={() => setResolution(item)}>{item}×{item}</button>)}
          </div>
          <small>Trocar resolução abre um arquivo independente salvo neste dispositivo.</small>
        </div>

        <div className="pixel-tool-group">
          <span>FERRAMENTA</span>
          <div className="pixel-tool-grid">
            <button type="button" className={tool === "pencil" ? "is-active" : ""} onClick={() => setTool("pencil")}><b>✎</b>Lápis <kbd>P</kbd></button>
            <button type="button" className={tool === "eraser" ? "is-active" : ""} onClick={() => setTool("eraser")}><b>⌫</b>Borracha <kbd>E</kbd></button>
            <button type="button" className={tool === "fill" ? "is-active" : ""} onClick={() => setTool("fill")}><b>▣</b>Balde <kbd>F</kbd></button>
            <button type="button" className={tool === "picker" ? "is-active" : ""} onClick={() => setTool("picker")}><b>◎</b>Conta-gotas <kbd>I</kbd></button>
          </div>
        </div>

        <div className="pixel-tool-group">
          <span>BLOCO</span>
          <div className="pixel-segmented">
            {([1, 2, 4] as BrushSize[]).map((item) => <button type="button" className={brushSize === item ? "is-active" : ""} key={item} onClick={() => setBrushSize(item)}>{item}×{item}</button>)}
          </div>
        </div>

        <div className="pixel-tool-group">
          <span>PALETA LIMITADA</span>
          <select value={palette} onChange={(event) => { const key = event.target.value as PaletteKey; setPalette(key); setActiveColor(PALETTES[key].colors[0]); }}>
            {Object.entries(PALETTES).map(([key, value]) => <option value={key} key={key}>{value.name}</option>)}
          </select>
          <div className="pixel-palette">
            {PALETTES[palette].colors.map((color) => <button type="button" key={color} className={activeColor.toLowerCase() === color.toLowerCase() ? "is-active" : ""} style={{ "--pixel-color": color } as React.CSSProperties} onClick={() => { setActiveColor(color); setTool("pencil"); }} aria-label={`Selecionar cor ${color}`}><i /></button>)}
          </div>
          <label className="pixel-custom-color">Cor livre <input type="color" value={activeColor} onChange={(event) => { setActiveColor(event.target.value); setTool("pencil"); }} /></label>
        </div>

        <div className="pixel-tool-group pixel-switches">
          <span>ASSISTÊNCIAS</span>
          <label><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />Grid pixel-a-pixel <kbd>G</kbd></label>
          <label><input type="checkbox" checked={symmetry} onChange={(event) => setSymmetry(event.target.checked)} />Espelho horizontal <kbd>X</kbd></label>
        </div>

        <div className="pixel-tool-group pixel-mission">
          <span>MISSÃO DE CROMA · PIXEL 01</span>
          <strong>Olho de Croma · ícone 16×16.</strong>
          <p>Faça um olho reconhecível usando poucos pixels. O sistema mede restrições de processo, não julga se o desenho é “bonito”.</p>
          <ol>{missionSteps.map((step) => <li className={step.done ? "is-done" : ""} key={step.label}><b>{step.done ? "✓" : "○"}</b>{step.label}</li>)}</ol>
          <small>{doneCount}/4 regras de síntese · {stats.painted} pixels pintados · {stats.colors} cor(es).</small>
        </div>
      </aside>

      <div className="pixel-stage">
        <div className="pixel-toolbar">
          <div><strong>Pixel Studio · {resolution}×{resolution}</strong><span>{tool === "pencil" ? `Lápis ${brushSize}×${brushSize}` : tool === "eraser" ? `Borracha ${brushSize}×${brushSize}` : tool === "fill" ? "Balde" : "Conta-gotas"}</span></div>
          <div className="pixel-toolbar-actions">
            <button type="button" onClick={undo} disabled={!history.length}>Desfazer</button>
            <button type="button" onClick={clear} disabled={!stats.painted}>Limpar</button>
            <button type="button" onClick={() => exportPng(1)} disabled={!stats.painted}>PNG nativo</button>
            <button type="button" onClick={() => exportPng(16)} disabled={!stats.painted}>PNG 16×</button>
          </div>
        </div>

        <div className="pixel-canvas-area">
          <div className="pixel-canvas-wrap">
            <canvas ref={canvasRef} className="pixel-canvas" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} aria-label={`Canvas Pixel Art ${resolution} por ${resolution}`} />
          </div>

          <aside className="pixel-preview-panel">
            <span>LEITURA REAL</span>
            <div className="pixel-preview-frame"><canvas ref={previewRef} aria-label="Prévia da pixel art sem grid" /></div>
            <strong>{resolution}×{resolution}</strong>
            <p>Veja sem a grade. Se a forma só funciona ampliada, ainda há ruído para remover.</p>
            <dl>
              <div><dt>Pixels</dt><dd>{stats.painted}</dd></div>
              <div><dt>Cores</dt><dd>{stats.colors}</dd></div>
              <div><dt>Área</dt><dd>{stats.width}×{stats.height}</dd></div>
            </dl>
          </aside>
        </div>

        <footer className="pixel-footer"><span>Pixel art é síntese: forma, valor, cluster e contraste antes de detalhe.</span><span>Salvo automaticamente neste dispositivo.</span></footer>
      </div>
    </section>
  );
}
