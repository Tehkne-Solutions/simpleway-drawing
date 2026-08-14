"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Layer = "construction" | "ink";
type Tool = "brush" | "eraser";
type Format = "landscape" | "portrait" | "square";
type Background = "paper" | "white";
type Guide = "none" | "thirds" | "center";
type Point = { x: number; y: number };
type Stroke = { id: string; layer: Layer; erase: boolean; color: string; size: number; points: Point[] };
type ReviewIntent = { preserve: string; transform: string; baseVersionNumber: number };
type Draft = { strokes: Stroke[]; title: string; notes: string; format: Format; background: Background; guide: Guide; constructionVisible: boolean; inkVisible: boolean; reviewIntent?: ReviewIntent };
type SaveState = "idle" | "saving" | "error";
type BaseState = "none" | "loading" | "ready" | "error";
type InitialArtwork = { id: string; title: string; notes: string; versionNumber: number; imageSrc: string };

const STORAGE_PREFIX = "swd.create.work-chamber.v2";
const REVIEW_INTENT_PREFIX = "swd.create.review-intent.v1";
const MAX_INTENT = 280;
const FORMAT_SIZE: Record<Format, { width: number; height: number }> = {
  landscape: { width: 1200, height: 900 }, portrait: { width: 900, height: 1200 }, square: { width: 1000, height: 1000 },
};
const PALETTE = [
  { name: "Carvão", color: "#292722" }, { name: "Sépia", color: "#714d34" }, { name: "Terracota", color: "#a44e2d" },
  { name: "Ultramarino", color: "#315b83" }, { name: "Veronese", color: "#39745a" }, { name: "Violeta", color: "#74567d" },
] as const;

function uid(): string { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function isFormat(value: unknown): value is Format { return value === "landscape" || value === "portrait" || value === "square"; }
function isBackground(value: unknown): value is Background { return value === "paper" || value === "white"; }
function isGuide(value: unknown): value is Guide { return value === "none" || value === "thirds" || value === "center"; }
function sanitizeReviewIntent(value: unknown, expectedVersion: number): ReviewIntent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const preserve = typeof raw.preserve === "string" ? raw.preserve.trim().slice(0, MAX_INTENT) : "";
  const transform = typeof raw.transform === "string" ? raw.transform.trim().slice(0, MAX_INTENT) : "";
  const baseVersionNumber = typeof raw.baseVersionNumber === "number" ? raw.baseVersionNumber : NaN;
  if (!preserve || !transform || !Number.isInteger(baseVersionNumber) || baseVersionNumber !== expectedVersion) return null;
  return { preserve, transform, baseVersionNumber };
}
function intentNotes(intent: ReviewIntent, fallback: string): string {
  return intent ? `Preservar: ${intent.preserve}\nTransformar: ${intent.transform}` : fallback;
}

function canvasHasVisibleMark(canvas: HTMLCanvasElement, background: Background): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const base: readonly [number, number, number] = background === "paper" ? [248, 239, 217] : [255, 255, 255];
  for (let index = 0; index < data.length; index += 4) {
    if (Math.abs((data[index] ?? 0) - base[0]) > 2 || Math.abs((data[index + 1] ?? 0) - base[1]) > 2 || Math.abs((data[index + 2] ?? 0) - base[2]) > 2) return true;
  }
  return false;
}

function canvasesDiffer(first: HTMLCanvasElement, second: HTMLCanvasElement): boolean {
  if (first.width !== second.width || first.height !== second.height) return true;
  const a = first.getContext("2d")?.getImageData(0, 0, first.width, first.height).data;
  const b = second.getContext("2d")?.getImageData(0, 0, second.width, second.height).data;
  if (!a || !b || a.length !== b.length) return true;
  for (let index = 0; index < a.length; index += 4) {
    if (Math.abs((a[index] ?? 0) - (b[index] ?? 0)) > 2 || Math.abs((a[index + 1] ?? 0) - (b[index + 1] ?? 0)) > 2 || Math.abs((a[index + 2] ?? 0) - (b[index + 2] ?? 0)) > 2) return true;
  }
  return false;
}

async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível materializar a obra.")), "image/png"));
}

async function uploadCanvas(blob: Blob): Promise<string> {
  const session = await fetch("/api/session/guest", { method: "POST" });
  if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
  const prepare = await fetch("/api/files/private-upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", byteSize: blob.size }) });
  const intent = await prepare.json();
  if (!prepare.ok) throw new Error(intent.code ?? "Não foi possível preparar o arquivo da obra.");
  const upload = await fetch(intent.uploadUrl, { method: "PUT", headers: { "content-type": "image/png" }, body: blob });
  if (!upload.ok) throw new Error("O envio da obra falhou.");
  const confirm = await fetch("/api/files/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileAssetId: intent.fileAssetId }) });
  if (!confirm.ok) throw new Error("Não foi possível confirmar o arquivo da obra.");
  return String(intent.fileAssetId);
}

export function WorkChamberCanvas({ initialArtwork }: { initialArtwork?: InitialArtwork }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const storageKey = useMemo(() => `${STORAGE_PREFIX}.${initialArtwork?.id ?? "new"}`, [initialArtwork?.id]);
  const reviewIntentKey = useMemo(() => initialArtwork ? `${REVIEW_INTENT_PREFIX}.${initialArtwork.id}` : null, [initialArtwork]);
  const [hydrated, setHydrated] = useState(false);
  const [baseState, setBaseState] = useState<BaseState>(initialArtwork ? "loading" : "none");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [layer, setLayer] = useState<Layer>("construction");
  const [tool, setTool] = useState<Tool>("brush");
  const [constructionColor, setConstructionColor] = useState("#a44e2d");
  const [inkColor, setInkColor] = useState("#292722");
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(28);
  const [constructionVisible, setConstructionVisible] = useState(true);
  const [inkVisible, setInkVisible] = useState(true);
  const [format, setFormat] = useState<Format>("landscape");
  const [background, setBackground] = useState<Background>("paper");
  const [guide, setGuide] = useState<Guide>("none");
  const [title, setTitle] = useState(initialArtwork?.title ?? "");
  const [notes, setNotes] = useState(initialArtwork?.notes ?? "");
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const renderArtwork = useCallback((target: HTMLCanvasElement, source: Stroke[]) => {
    const size = FORMAT_SIZE[format];
    if (target.width !== size.width) target.width = size.width;
    if (target.height !== size.height) target.height = size.height;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = background === "paper" ? "#f8efd9" : "#ffffff";
    ctx.fillRect(0, 0, target.width, target.height);
    const baseImage = baseImageRef.current;
    if (baseImage) {
      const scale = Math.min(target.width / baseImage.naturalWidth, target.height / baseImage.naturalHeight);
      const width = baseImage.naturalWidth * scale;
      const height = baseImage.naturalHeight * scale;
      ctx.drawImage(baseImage, (target.width - width) / 2, (target.height - height) / 2, width, height);
    }
    ctx.restore();

    const renderLayer = (layerName: Layer, visible: boolean, opacity: number) => {
      if (!visible) return;
      const layerCanvas = document.createElement("canvas");
      layerCanvas.width = target.width;
      layerCanvas.height = target.height;
      const layerContext = layerCanvas.getContext("2d");
      if (!layerContext) return;
      const scale = Math.min(target.width, target.height) / 1000;
      for (const stroke of source) {
        if (stroke.layer !== layerName || stroke.points.length === 0) continue;
        const first = stroke.points[0];
        if (!first) continue;
        layerContext.save();
        layerContext.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
        layerContext.strokeStyle = stroke.color;
        layerContext.fillStyle = stroke.color;
        layerContext.lineWidth = Math.max(1, stroke.size * scale);
        layerContext.lineCap = "round";
        layerContext.lineJoin = "round";
        if (stroke.points.length === 1) {
          layerContext.beginPath();
          layerContext.arc(first.x * target.width, first.y * target.height, layerContext.lineWidth / 2, 0, Math.PI * 2);
          layerContext.fill();
        } else {
          layerContext.beginPath();
          layerContext.moveTo(first.x * target.width, first.y * target.height);
          for (const point of stroke.points.slice(1)) layerContext.lineTo(point.x * target.width, point.y * target.height);
          layerContext.stroke();
        }
        layerContext.restore();
      }
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(layerCanvas, 0, 0);
      ctx.restore();
    };
    renderLayer("construction", constructionVisible, .42);
    renderLayer("ink", inkVisible, 1);
  }, [background, constructionVisible, format, inkVisible]);

  const drawGuide = useCallback((target: HTMLCanvasElement) => {
    if (guide === "none") return;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = "rgba(74,58,37,.24)";
    ctx.lineWidth = Math.max(1, Math.min(target.width, target.height) / 1000);
    ctx.setLineDash([9, 9]);
    const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (guide === "thirds") {
      line(target.width / 3, 0, target.width / 3, target.height); line((target.width * 2) / 3, 0, (target.width * 2) / 3, target.height);
      line(0, target.height / 3, target.width, target.height / 3); line(0, (target.height * 2) / 3, target.width, (target.height * 2) / 3);
    } else { line(target.width / 2, 0, target.width / 2, target.height); line(0, target.height / 2, target.width, target.height / 2); }
    ctx.restore();
  }, [guide]);

  const redraw = useCallback((extra?: Stroke | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderArtwork(canvas, extra ? [...strokesRef.current, extra] : strokesRef.current);
    drawGuide(canvas);
  }, [drawGuide, renderArtwork]);

  useEffect(() => {
    if (!initialArtwork) return;
    setBaseState("loading");
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      baseImageRef.current = image;
      const ratio = image.naturalWidth / Math.max(image.naturalHeight, 1);
      setFormat(ratio > 1.1 ? "landscape" : ratio < .9 ? "portrait" : "square");
      setBaseState("ready");
      setError(null);
    };
    image.onerror = () => { baseImageRef.current = null; setBaseState("error"); setError("Não foi possível abrir a versão privada atual desta obra."); };
    image.src = initialArtwork.imageSrc;
    return () => { image.onload = null; image.onerror = null; };
  }, [initialArtwork]);

  useEffect(() => {
    let recoveredDraft = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        recoveredDraft = true;
        const parsed = JSON.parse(raw) as Partial<Draft>;
        if (Array.isArray(parsed.strokes)) {
          const safe = parsed.strokes.slice(0, 4000).filter((stroke): stroke is Stroke => Boolean(stroke && typeof stroke === "object" && (stroke.layer === "construction" || stroke.layer === "ink") && Array.isArray(stroke.points)));
          strokesRef.current = safe; setStrokes(safe);
        }
        if (!initialArtwork && typeof parsed.title === "string") setTitle(parsed.title.slice(0, 200));
        if (typeof parsed.notes === "string") setNotes(parsed.notes.slice(0, 2000));
        if (isFormat(parsed.format)) setFormat(parsed.format);
        if (isBackground(parsed.background)) setBackground(parsed.background);
        if (isGuide(parsed.guide)) setGuide(parsed.guide);
        if (typeof parsed.constructionVisible === "boolean") setConstructionVisible(parsed.constructionVisible);
        if (typeof parsed.inkVisible === "boolean") setInkVisible(parsed.inkVisible);
        if (initialArtwork && parsed.reviewIntent) {
          const restoredIntent = sanitizeReviewIntent(parsed.reviewIntent, initialArtwork.versionNumber);
          if (restoredIntent) setReviewIntent(restoredIntent);
        }
      }
    } catch {}

    if (initialArtwork && reviewIntentKey) {
      try {
        const rawIntent = window.sessionStorage.getItem(reviewIntentKey);
        if (rawIntent) {
          window.sessionStorage.removeItem(reviewIntentKey);
          if (!recoveredDraft) {
            const privateIntent = sanitizeReviewIntent(JSON.parse(rawIntent), initialArtwork.versionNumber);
            if (privateIntent) {
              setReviewIntent(privateIntent);
              setNotes(intentNotes(privateIntent, initialArtwork.notes ?? ""));
            }
          }
        }
      } catch {
        try { window.sessionStorage.removeItem(reviewIntentKey); } catch {}
      }
    }
    setHydrated(true);
  }, [initialArtwork, reviewIntentKey, storageKey]);

  useEffect(() => {
    strokesRef.current = strokes;
    redraw();
    if (!hydrated) return;
    const draft: Draft = { strokes, title, notes, format, background, guide, constructionVisible, inkVisible, ...(reviewIntent ? { reviewIntent } : {}) };
    try { window.localStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}
  }, [background, constructionVisible, format, guide, hydrated, inkVisible, notes, redraw, reviewIntent, storageKey, strokes, title]);
  useEffect(() => { redraw(); }, [baseState, redraw]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const beginStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (saveState === "saving" || baseState === "loading" || baseState === "error") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const active: Stroke = { id: uid(), layer, erase: tool === "eraser", color: layer === "construction" ? constructionColor : inkColor, size: tool === "eraser" ? eraserSize : brushSize, points: [pointFromEvent(event)] };
    activeStrokeRef.current = active; setRedoStack([]); setError(null); redraw(active);
  };
  const moveStroke = (event: React.PointerEvent<HTMLCanvasElement>) => { const active = activeStrokeRef.current; if (!active) return; active.points.push(pointFromEvent(event)); redraw(active); };
  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current; if (!active) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    active.points.push(pointFromEvent(event)); activeStrokeRef.current = null;
    const next = [...strokesRef.current, active]; strokesRef.current = next; setStrokes(next); redraw();
  };
  const cancelStroke = () => { activeStrokeRef.current = null; redraw(); };
  const undo = () => { const last = strokesRef.current.at(-1); if (!last) return; const next = strokesRef.current.slice(0, -1); strokesRef.current = next; setStrokes(next); setRedoStack((current) => [...current, last]); };
  const redo = () => { const last = redoStack.at(-1); if (!last) return; const next = [...strokesRef.current, last]; strokesRef.current = next; setStrokes(next); setRedoStack((current) => current.slice(0, -1)); };
  const clearLayer = () => { const next = strokesRef.current.filter((stroke) => stroke.layer !== layer); strokesRef.current = next; setStrokes(next); setRedoStack([]); };

  const saveArtwork = async () => {
    if (saveState === "saving") return;
    if (initialArtwork && baseState !== "ready") { setError("A versão base ainda não está pronta para materialização."); return; }
    if (!title.trim()) { setError("Dê um nome à obra antes de registrá-la."); return; }
    if (strokesRef.current.length === 0) { setError(initialArtwork ? "Faça ao menos uma nova decisão antes de registrar outra versão." : "A Câmara precisa de ao menos um gesto antes de registrar uma obra."); return; }
    setSaveState("saving"); setError(null);
    try {
      const exportCanvas = document.createElement("canvas"); renderArtwork(exportCanvas, strokesRef.current);
      if (initialArtwork) {
        const baselineCanvas = document.createElement("canvas"); renderArtwork(baselineCanvas, []);
        if (!canvasesDiffer(exportCanvas, baselineCanvas)) throw new Error("A composição ainda é idêntica à versão anterior. Faça uma alteração visível antes de registrar outra versão.");
      } else if (!canvasHasVisibleMark(exportCanvas, background)) throw new Error("Torne visível ao menos uma camada com marca antes de registrar a obra.");
      const blob = await canvasBlob(exportCanvas); const fileAssetId = await uploadCanvas(blob);
      const response = initialArtwork
        ? await fetch(`/api/artworks/${encodeURIComponent(initialArtwork.id)}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileAssetId, notes: notes.trim() || null, source: "CANVAS" }) })
        : await fetch("/api/artworks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileAssetId, type: "ARTWORK", title: title.trim(), notes: notes.trim() || null, source: "CANVAS" }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar a obra.");
      try { window.localStorage.removeItem(storageKey); } catch {}
      const artworkId = initialArtwork?.id ?? payload.artwork?.id; if (!artworkId) throw new Error("ARTWORK_ID_MISSING_AFTER_SAVE");
      router.push(`/create/${artworkId}`); router.refresh();
    } catch (cause) { setSaveState("error"); setError(cause instanceof Error ? cause.message : "Não foi possível registrar a obra."); return; }
    setSaveState("idle");
  };

  const activeColor = layer === "construction" ? constructionColor : inkColor;
  const setActiveColor = layer === "construction" ? setConstructionColor : setInkColor;
  const versionLabel = initialArtwork ? `BASE · V${initialArtwork.versionNumber}` : "NOVA OBRA";

  return (
    <div className="work-chamber-shell">
      <aside className="work-chamber-tools" aria-label="Ferramentas da Câmara da Obra">
        <section className="work-tool-group"><span>CAMADAS DE PENSAMENTO</span><button type="button" className={layer === "construction" ? "is-active" : ""} onClick={() => { setLayer("construction"); setTool("brush"); }}><b>01</b><span>Construção</span><small>estrutura leve</small></button><button type="button" className={layer === "ink" ? "is-active" : ""} onClick={() => { setLayer("ink"); setTool("brush"); }}><b>02</b><span>Tinta</span><small>decisão final</small></button><div className="work-layer-visibility"><label><input type="checkbox" checked={constructionVisible} onChange={(event) => setConstructionVisible(event.target.checked)} /> Construção</label><label><input type="checkbox" checked={inkVisible} onChange={(event) => setInkVisible(event.target.checked)} /> Tinta</label></div></section>
        <section className="work-tool-group"><span>INSTRUMENTO</span><div className="work-segmented"><button type="button" className={tool === "brush" ? "is-active" : ""} onClick={() => setTool("brush")}>Pincel</button><button type="button" className={tool === "eraser" ? "is-active" : ""} onClick={() => setTool("eraser")}>Borracha</button></div><label className="work-range">{tool === "brush" ? "Espessura" : "Raio da borracha"}<input type="range" min={tool === "brush" ? 2 : 10} max={tool === "brush" ? 22 : 60} value={tool === "brush" ? brushSize : eraserSize} onChange={(event) => tool === "brush" ? setBrushSize(Number(event.target.value)) : setEraserSize(Number(event.target.value))} /><b>{tool === "brush" ? brushSize : eraserSize}</b></label></section>
        <section className="work-tool-group"><span>PIGMENTOS</span><div className="work-palette">{PALETTE.map((pigment) => <button key={pigment.color} type="button" className={activeColor === pigment.color ? "is-active" : ""} onClick={() => { setActiveColor(pigment.color); setTool("brush"); }} title={pigment.name} aria-label={pigment.name}><i style={{ backgroundColor: pigment.color }} /></button>)}</div></section>
        <section className="work-tool-group work-history-tools"><span>GESTO · {versionLabel}</span><div><button type="button" disabled={strokes.length === 0} onClick={undo}>↶ Desfazer</button><button type="button" disabled={redoStack.length === 0} onClick={redo}>↷ Refazer</button></div><button type="button" className="work-danger" disabled={!strokes.some((stroke) => stroke.layer === layer)} onClick={clearLayer}>Limpar camada ativa</button></section>
      </aside>
      <section className="work-canvas-station">
        <header className="work-canvas-toolbar"><div className="work-format-tools" aria-label="Formato da obra"><button type="button" className={format === "landscape" ? "is-active" : ""} onClick={() => setFormat("landscape")}>Paisagem</button><button type="button" className={format === "portrait" ? "is-active" : ""} onClick={() => setFormat("portrait")}>Retrato</button><button type="button" className={format === "square" ? "is-active" : ""} onClick={() => setFormat("square")}>Quadrado</button></div><div className="work-guide-tools"><label>Guia<select value={guide} onChange={(event) => setGuide(event.target.value as Guide)}><option value="none">Nenhuma</option><option value="thirds">Terços</option><option value="center">Eixos centrais</option></select></label><label>Papel<select value={background} onChange={(event) => setBackground(event.target.value as Background)}><option value="paper">Marfim</option><option value="white">Branco</option></select></label></div></header>
        <div className={`work-canvas-frame format-${format}`}><canvas ref={canvasRef} className="work-canvas" aria-label="Canvas livre da Câmara da Obra" onPointerDown={beginStroke} onPointerMove={moveStroke} onPointerUp={finishStroke} onPointerCancel={cancelStroke} /></div>
        <footer className="work-canvas-status"><span>{initialArtwork ? baseState === "ready" ? `BASE V${initialArtwork.versionNumber} · PRONTA` : baseState === "error" ? "BASE INDISPONÍVEL" : "CARREGANDO BASE…" : "NOVA OBRA"} · {layer === "construction" ? "CONSTRUÇÃO" : "TINTA"}</span><span>{strokes.length} nova(s) decisão(ões) no draft</span></footer>
      </section>
      <aside className="work-chamber-record">
        <div className="work-croma-seal"><span>C</span><div><small>CROMA · CÂMARA DA OBRA</small><strong>{initialArtwork ? "Continue sem apagar o passado." : "Combine, não demonstre."}</strong></div></div>
        <p>{initialArtwork ? `A versão ${initialArtwork.versionNumber} é uma base raster imutável. Construção, tinta e borracha desta sessão pertencem à próxima versão.` : "Você já treinou partes separadas. Aqui a pergunta muda: o que essas habilidades conseguem construir juntas?"}</p>
        {reviewIntent ? <section className="work-review-intent"><span>DECISÃO TRAZIDA DA MESA</span><div><p><b>Preservar</b>{reviewIntent.preserve}</p><p><b>Transformar</b>{reviewIntent.transform}</p></div><small>Passagem privada consumida nesta aba para a base V{reviewIntent.baseVersionNumber}. Se já existia draft local desta obra, a nova intenção foi descartada para não sobrescrever trabalho em andamento.</small></section> : null}
        <section className="work-record-fields"><label>Nome da obra<input value={title} readOnly={Boolean(initialArtwork)} maxLength={200} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Guardião do Jardim" /></label><label>Nota de processo<textarea rows={5} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="O que você combinou, decidiu ou descobriu?" /></label></section>
        <section className="work-save-summary"><span>REGISTRO PRIVADO</span><strong>{initialArtwork ? `Nova versão CANVAS · V${initialArtwork.versionNumber + 1}` : "Artwork · Canvas"}</strong><p>{initialArtwork ? "A nova composição entra no histórico da mesma obra. A versão anterior permanece intacta e pode ser comparada no arquivo." : "O PNG composto entra no Arquivo do Atelier e no Atlas. Guias nunca são incorporadas à obra; o draft permanece apenas neste dispositivo até o registro."}</p></section>
        {error ? <p className="flow-error" role="alert">{error}</p> : null}
        <button className="primary work-save-button" type="button" disabled={saveState === "saving" || baseState === "loading"} onClick={saveArtwork}>{saveState === "saving" ? "Materializando obra…" : initialArtwork ? `Registrar versão ${initialArtwork.versionNumber + 1}` : "Registrar obra no Atlas"}</button>
      </aside>
    </div>
  );
}
