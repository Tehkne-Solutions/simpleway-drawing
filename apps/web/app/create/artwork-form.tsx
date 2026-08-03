"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

type ArtworkType = "STUDY" | "SKETCH" | "PROJECT" | "ARTWORK";
type State = "idle" | "uploading" | "confirming" | "saving" | "error";

async function uploadPrivate(file: File): Promise<string> {
  const session = await fetch("/api/session/guest", { method: "POST" });
  if (!session.ok) throw new Error("Não foi possível iniciar sua sessão.");
  const prepare = await fetch("/api/files/private-upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mimeType: file.type, byteSize: file.size }),
  });
  const intent = await prepare.json();
  if (!prepare.ok) throw new Error(intent.code ?? "Não foi possível preparar o upload.");
  const upload = await fetch(intent.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
  if (!upload.ok) throw new Error("O envio da imagem falhou.");
  const confirm = await fetch("/api/files/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  if (!confirm.ok) throw new Error("Não foi possível validar o arquivo enviado.");
  return String(intent.fileAssetId);
}

export function ArtworkForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<ArtworkType>("STUDY");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function submit() {
    if (!file || !title.trim() || state !== "idle") return;
    setError(null);
    try {
      if (!ALLOWED.has(file.type)) throw new Error("Envie uma imagem JPEG, PNG ou WEBP.");
      if (file.size <= 0 || file.size > MAX_BYTES) throw new Error("A imagem deve ter até 15 MB.");
      setState("uploading");
      const fileAssetId = await uploadPrivate(file);
      setState("saving");
      const response = await fetch("/api/artworks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileAssetId, type, title: title.trim(), notes: notes.trim() || null, source: "UPLOAD" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar a criação.");
      router.push(`/create/${payload.artwork.id}`);
      router.refresh();
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Falha ao registrar criação.");
    }
  }

  return (
    <section className="create-form">
      <div className="create-fields">
        <label>Tipo
          <select value={type} onChange={(event) => setType(event.target.value as ArtworkType)}>
            <option value="STUDY">Estudo</option>
            <option value="SKETCH">Sketch</option>
            <option value="PROJECT">Projeto</option>
            <option value="ARTWORK">Artwork</option>
          </select>
        </label>
        <label>Título
          <input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Estudo de formas" />
        </label>
        <label>Notas do processo
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="O que você treinou, tentou ou quer comparar depois?" rows={4} />
        </label>
      </div>

      <label className="upload-drop create-upload">
        {preview ? <img src={preview} alt="Prévia da criação selecionada" /> : <span>Escolher foto ou arquivo da criação</span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setState("idle"); setError(null); }} />
      </label>
      <p className="create-privacy">Privado por padrão. Nada é publicado sem uma ação explícita sua.</p>
      {error ? <p className="flow-error" role="alert">{error}</p> : null}
      <button className="primary" type="button" onClick={submit} disabled={!file || !title.trim() || state === "uploading" || state === "saving"}>
        {state === "uploading" ? "Enviando…" : state === "saving" ? "Registrando…" : "Salvar criação"}
      </button>
    </section>
  );
}
