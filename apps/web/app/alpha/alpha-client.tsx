"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AlphaGateButton({ ready }: { ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function record() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/alpha/gate", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.nextAction?.description ?? "O selo ainda aguarda uma das provas do Rito Alpha.");
        return;
      }
      router.push("/resume");
      router.refresh();
    } catch {
      setMessage("Não foi possível registrar o Rito Alpha agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="alpha-gate-action">
      <button className="primary" type="button" disabled={!ready || busy} onClick={record}>
        {busy ? "Selando…" : ready ? "Selar Alpha e abrir a próxima região" : "Selo Alpha ainda fechado"}
      </button>
      {message ? <p className="alpha-gate-message" role="status">{message}</p> : null}
    </div>
  );
}
