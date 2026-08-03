"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

type State = "idle" | "uploading" | "confirming" | "submitting" | "done" | "error";

export function DrawingZeroClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function ensureSession() {
    const response = await fetch("/api/session/guest", { method: "POST" });
    if (!response.ok) throw new Error("Não foi possível iniciar sua sessão.");
  }

  async function submit() {
    if (!file || state === "uploading" || state === "confirming" || state === "submitting") return;
    setError(null);
    try {
      if (!ALLOWED.has(file.type)) throw new Error("Envie uma imagem JPEG, PNG ou WEBP.");
      if (file.size <= 0 || file.size > MAX_BYTES) throw new Error("A imagem deve ter até 15 MB.");
      await ensureSession();

      setState("uploading");
      const prepare = await fetch("/api/files/private-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, byteSize: file.size }),
      });
      const intent = await prepare.json();
      if (!prepare.ok) throw new Error(intent.code ?? "Não foi possível preparar o upload.");

      const upload = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error("O envio da imagem falhou.");

      setState("confirming");
      const confirm = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
      });
      if (!confirm.ok) throw new Error("Não foi possível validar o arquivo enviado.");

      setState("submitting");
      const drawing = await fetch("/api/drawing-zero", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileAssetId: intent.fileAssetId, source: "UPLOAD" }),
      });
      if (!drawing.ok) throw new Error("Não foi possível registrar seu Drawing Zero.");

      setState("done");
      router.push("/journey");
      router.refresh();
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Algo deu errado. Tente novamente.");
    }
  }

  return (
    <section className="upload-zone" aria-label="Enviar Drawing Zero">
      <label className="upload-drop">
        {preview ? <img src={preview} alt="Prévia do Drawing Zero selecionado" /> : <span>Escolher foto ou arquivo do desenho</span>}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setState("idle");
            setError(null);
          }}
        />
      </label>
      <div className="upload-meta">
        <p>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "JPEG, PNG ou WEBP · até 15 MB"}</p>
        <p>Sua obra nasce privada e será usada como baseline da sua evolução.</p>
      </div>
      {error ? <p className="flow-error" role="alert">{error}</p> : null}
      <button className="primary" type="button" disabled={!file || state === "uploading" || state === "confirming" || state === "submitting"} onClick={submit}>
        {state === "uploading" ? "Enviando…" : state === "confirming" ? "Validando…" : state === "submitting" ? "Registrando…" : "Registrar Drawing Zero"}
      </button>
    </section>
  );
}
