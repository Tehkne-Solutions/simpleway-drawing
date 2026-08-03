"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function VersionForm({ artworkId }: { artworkId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!ALLOWED.has(file.type)) throw new Error("Envie uma imagem JPEG, PNG ou WEBP.");
      if (file.size <= 0 || file.size > MAX_BYTES) throw new Error("A imagem deve ter até 15 MB.");
      const prepare = await fetch("/api/files/private-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, byteSize: file.size }),
      });
      const intent = await prepare.json();
      if (!prepare.ok) throw new Error(intent.code ?? "Não foi possível preparar o upload.");
      const upload = await fetch(intent.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!upload.ok) throw new Error("O envio da nova versão falhou.");
      const confirm = await fetch("/api/files/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileAssetId: intent.fileAssetId }) });
      if (!confirm.ok) throw new Error("Não foi possível validar o arquivo enviado.");
      const response = await fetch(`/api/artworks/${artworkId}/versions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileAssetId: intent.fileAssetId, source: "UPLOAD", notes: notes.trim() || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar a nova versão.");
      setFile(null);
      setNotes("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registrar nova versão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="version-form">
      <div>
        <p className="eyebrow">Nova versão</p>
        <h2>Continue sem apagar o processo.</h2>
        <p>Uma nova versão preserva as anteriores para comparação futura.</p>
      </div>
      <label className="upload-drop version-upload">
        {preview ? <img src={preview} alt="Prévia da nova versão" /> : <span>Escolher nova versão</span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null); }} />
      </label>
      <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="O que mudou nesta versão?" />
      {error ? <p className="flow-error" role="alert">{error}</p> : null}
      <button className="primary" type="button" disabled={!file || busy} onClick={submit}>{busy ? "Registrando…" : "Adicionar versão"}</button>
    </section>
  );
}
