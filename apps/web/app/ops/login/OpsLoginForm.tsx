"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OpsLoginForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/ops/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      setLoading(false);
      setError("Token operacional inválido.");
      return;
    }
    router.replace("/ops");
    router.refresh();
  }

  return (
    <form className="flow-card" onSubmit={submit} style={{ maxWidth: 520, margin: "12vh auto" }}>
      <p className="eyebrow">Closed Alpha · Operações</p>
      <h1 className="flow-title">Control Center</h1>
      <p className="lead compact">Acesso interno. O token nunca é armazenado no navegador após a autenticação.</p>
      <label style={{ display: "grid", gap: 8, marginTop: 24 }}>
        <strong>ALPHA_OPS_TOKEN</strong>
        <input
          autoComplete="current-password"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          minLength={32}
          required
          style={{ minHeight: 46, borderRadius: 12, border: "1px solid #d7d7d2", padding: "0 14px" }}
        />
      </label>
      {error ? <p role="alert" style={{ color: "#9b1c1c" }}>{error}</p> : null}
      <button className="primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Validando…" : "Entrar"}
      </button>
    </form>
  );
}
