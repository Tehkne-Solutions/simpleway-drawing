"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export function DrawingZeroForm({ returnTo = null }: { returnTo?: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  function choose(next: File | null) {
    setError(null);
    setCompleted(false);
    if (!next) { setFile(null); return; }
    if (!ACCEPT.includes(next.type)) { setError("Use JPG, PNG ou WebP."); setFile(null); return; }
    if (next.size > MAX_BYTES) { setError("A imagem deve ter no máximo 10 MB."); setFile(null); return; }
    setFile(next);
  }

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await fetch("/api/session/guest", { method: "POST" });
      if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
      const prepare = await fetch("/api/files/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, purpose: "DRAWING_ZERO" }) });
      const prepared = await prepare.json();
      if (!prepare.ok) throw new Error(prepared.code ?? "Não foi possível preparar o envio.");
      const upload = await fetch(prepared.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!upload.ok) throw new Error("Não foi possível enviar a imagem.");
      const confirm = await fetch("/api/files/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: prepared.assetId, uploadToken: prepared.uploadToken }) });
      const confirmed = await confirm.json();
      if (!confirm.ok) throw new Error(confirmed.code ?? "Não foi possível confirmar o arquivo.");
      const drawingZero = await fetch("/api/drawing-zero", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: prepared.assetId, notes: notes.trim() || undefined }) });
      const result = await drawingZero.json();
      if (!drawingZero.ok) throw new Error(result.code ?? "Não foi possível registrar o Drawing Zero.");
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registrar o Drawing Zero.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drawing-zero-form">
      {completed ? (
        <section className="drawing-zero-success" aria-live="polite">
          <p className="eyebrow">Evidence registrada</p>
          <h2>Seu ponto zero está preservado.</h2>
          <p>O Atlas agora pode comparar o que muda no seu processo ao longo da jornada.</p>
          <div className="flow-actions split-actions">
            <Link className="secondary link-button" href="/journey">Ver no Atlas</Link>
            {returnTo ? <Link className="primary link-button" href={returnTo}>Retornar à missão →</Link> : <Link className="primary link-button" href="/learn">Continuar campanha →</Link>}
          </div>
        </section>
      ) : (
        <>
          <label className="drawing-zero-drop">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0] ?? null)} />
            {previewUrl ? <img src={previewUrl} alt="Prévia privada do Drawing Zero" /> : <span><strong>Adicionar seu desenho</strong><small>JPG, PNG ou WebP · até 10 MB</small></span>}
          </label>
          <label className="drawing-zero-notes"><span>Observação opcional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Como foi desenhar isso? Onde você travou? O que tentou resolver?" maxLength={1200} /></label>
          {error ? <p className="flow-error" role="alert">{error}</p> : null}
          <div className="flow-actions"><button type="button" className="primary" disabled={!file || busy} onClick={submit}>{busy ? "Preservando Evidence…" : "Registrar Drawing Zero"}</button></div>
        </>
      )}
    </div>
  );
}
