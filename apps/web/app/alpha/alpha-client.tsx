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
        setMessage(payload.nextAction?.description ?? "Ainda há requisitos do Alpha Gate para concluir.");
        return;
      }
      setMessage("Foundation Alpha registrada no seu Journey.");
      router.refresh();
    } catch {
      setMessage("Não foi possível registrar o Alpha Gate agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="alpha-gate-action">
      <button className="primary" type="button" disabled={!ready || busy} onClick={record}>
        {busy ? "Registrando…" : ready ? "Concluir Alpha Gate" : "Alpha Gate ainda bloqueado"}
      </button>
      {message ? <p className="alpha-gate-message" role="status">{message}</p> : null}
    </div>
  );
}
