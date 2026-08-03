"use client";

import { useEffect, useState } from "react";

type Category = "LEARNING" | "USABILITY" | "BUG" | "CONTENT" | "OTHER";
type FeedbackRecord = {
  id: string;
  category: Category;
  rating: number;
  message: string;
  path: string | null;
  createdAt: string;
};

const categoryLabels: Record<Category, string> = {
  LEARNING: "Aprendizado",
  USABILITY: "Usabilidade",
  BUG: "Bug",
  CONTENT: "Conteúdo",
  OTHER: "Outro",
};

async function ensureSession(): Promise<void> {
  const response = await fetch("/api/session/guest", { method: "POST" });
  if (!response.ok) throw new Error("Não foi possível iniciar a sessão do Alpha.");
}

export function FeedbackClient() {
  const [category, setCategory] = useState<Category>("LEARNING");
  const [rating, setRating] = useState(4);
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<FeedbackRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  async function loadRecent() {
    await ensureSession();
    const response = await fetch("/api/feedback", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar seus relatos anteriores.");
    const payload = (await response.json()) as { feedback: FeedbackRecord[] };
    setRecent(payload.feedback);
  }

  useEffect(() => {
    loadRecent().then(() => setStatus("idle")).catch((cause: unknown) => {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Falha ao carregar feedback.");
    });
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      setStatus("error");
      setError("Conte em poucas palavras o que aconteceu.");
      return;
    }

    setStatus("saving");
    setError(null);
    try {
      await ensureSession();
      let path: string | null = null;
      if (document.referrer) {
        const referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin) path = referrer.pathname;
      }
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, rating, message: trimmed, path }),
      });
      const payload = (await response.json()) as { id?: string; code?: string };
      if (!response.ok) throw new Error(payload.code ?? "Não foi possível registrar seu feedback.");
      setMessage("");
      await loadRecent();
      setStatus("success");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Falha ao enviar feedback.");
    }
  }

  const busy = status === "loading" || status === "saving";
  const messageInvalid = status === "error" && Boolean(error);
  const liveStatus = status === "saving"
    ? "Registrando feedback."
    : status === "success"
      ? "Feedback registrado com sucesso."
      : "";

  return (
    <div className="feedback-layout">
      <form className="feedback-form" onSubmit={submit} aria-busy={busy} noValidate>
        <div className="sr-only" aria-live="polite" aria-atomic="true">{liveStatus}</div>

        <div>
          <label htmlFor="feedback-category">O que você está avaliando?</label>
          <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <fieldset className="feedback-rating">
          <legend>Como foi essa experiência?</legend>
          <div>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className={rating === value ? "selected" : ""}>
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} />
                <span aria-hidden="true">{value}</span>
                <span className="sr-only">{value} de 5</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="feedback-message">O que funcionou, atrapalhou ou deveria mudar?</label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (error) setError(null);
              if (status === "error") setStatus("idle");
            }}
            maxLength={2000}
            rows={7}
            placeholder="Ex.: entendi o exercício, mas não percebi onde deveria tocar para continuar…"
            aria-describedby="feedback-message-count"
            aria-invalid={messageInvalid}
          />
          <small id="feedback-message-count" aria-live="off">{message.length}/2000 caracteres</small>
        </div>

        {error ? <p className="flow-error" role="alert">{error}</p> : null}
        {status === "success" ? <p className="feedback-success" role="status">Feedback registrado. Obrigado por ajudar a melhorar o Alpha.</p> : null}
        <button className="primary" type="submit" disabled={busy}>
          {status === "saving" ? "Registrando…" : "Enviar feedback"}
        </button>
      </form>

      <aside className="feedback-history" aria-label="Feedbacks recentes" aria-busy={status === "loading"}>
        <p className="eyebrow">Seus relatos</p>
        <h2>Histórico recente</h2>
        {status === "loading" ? <p role="status">Carregando…</p> : null}
        {recent.length === 0 && status !== "loading" ? <p>Seu primeiro relato aparecerá aqui.</p> : null}
        {recent.map((item) => (
          <article key={item.id}>
            <div><strong>{categoryLabels[item.category]}</strong><span>{item.rating}/5</span></div>
            <p>{item.message}</p>
            <small>{new Date(item.createdAt).toLocaleString("pt-BR")}</small>
          </article>
        ))}
      </aside>
    </div>
  );
}
