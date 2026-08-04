"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LifecycleStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export function InterventionActions({ userId, status }: { userId: string; status: LifecycleStatus }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<LifecycleStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(nextStatus: LifecycleStatus) {
    setPending(nextStatus);
    setMessage(null);
    try {
      const response = await fetch("/api/ops/interventions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus, note: note.trim() || null }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.code ?? "INTERVENTION_UPDATE_FAILED");
      setNote("");
      setMessage(nextStatus === "RESOLVED" ? "Intervenção resolvida." : nextStatus === "ACKNOWLEDGED" ? "Intervenção assumida." : "Intervenção reaberta.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar intervenção.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 240 }}>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        Nota operacional opcional
        <input
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          maxLength={500}
          placeholder="Ex.: enviei orientação por WhatsApp"
          disabled={pending !== null}
        />
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status === "OPEN" ? <button type="button" className="secondary" disabled={pending !== null} onClick={() => submit("ACKNOWLEDGED")}>{pending === "ACKNOWLEDGED" ? "Salvando…" : "Assumir"}</button> : null}
        {status !== "RESOLVED" ? <button type="button" disabled={pending !== null} onClick={() => submit("RESOLVED")}>{pending === "RESOLVED" ? "Salvando…" : "Resolver"}</button> : null}
        {status === "RESOLVED" ? <button type="button" className="secondary" disabled={pending !== null} onClick={() => submit("OPEN")}>{pending === "OPEN" ? "Salvando…" : "Reabrir"}</button> : null}
      </div>
      {message ? <small role="status">{message}</small> : null}
    </div>
  );
}
