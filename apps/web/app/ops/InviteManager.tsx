"use client";

import { FormEvent, useEffect, useState } from "react";

type Invite = {
  id: string;
  label: string;
  status: string;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type BatchItem = { invite: Invite; code: string };

export function InviteManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [createdUrls, setCreatedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/ops/invites", { cache: "no-store" });
    if (response.ok) setInvites((await response.json()).invites);
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setCreatedUrls([]);
    setError(null);
    try {
      const response = await fetch("/api/ops/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label, maxUses, quantity, expiresInDays }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.code ?? "INVITE_CREATE_FAILED");

      const origin = window.location.origin;
      const urls = Array.isArray(payload.batch)
        ? (payload.batch as BatchItem[]).map((item) => `${origin}/join/${item.code}`)
        : [`${origin}/join/${payload.code}`];
      setCreatedUrls(urls);
      setLabel("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar os convites.");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    await fetch("/api/ops/invites", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function copyAll() {
    await navigator.clipboard.writeText(createdUrls.join("\n"));
  }

  return (
    <section style={{ marginTop: 36 }}>
      <p className="eyebrow">Convites do Closed Alpha</p>
      <h2 style={{ marginTop: 6 }}>Entrada controlada da cohort</h2>
      <p className="lead compact">Para turmas, prefira links únicos: cada tester recebe um código one-time e pode ser revogado individualmente.</p>
      <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 2fr) repeat(3, minmax(100px, 1fr)) auto", gap: 10, alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 6 }}><small>Identificação / cohort</small><input value={label} onChange={(e) => setLabel(e.target.value)} required minLength={2} maxLength={110} placeholder="Ex.: Alpha 01 · Agosto" /></label>
        <label style={{ display: "grid", gap: 6 }}><small>Links únicos</small><input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
        <label style={{ display: "grid", gap: 6 }}><small>Usos por link</small><input type="number" min={1} max={100} value={quantity > 1 ? 1 : maxUses} disabled={quantity > 1} onChange={(e) => setMaxUses(Number(e.target.value))} /></label>
        <label style={{ display: "grid", gap: 6 }}><small>Validade (dias)</small><input type="number" min={1} max={90} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} /></label>
        <button className="primary" disabled={loading} type="submit">{loading ? "Criando…" : quantity > 1 ? `Gerar ${quantity} links` : "Novo convite"}</button>
      </form>

      {quantity > 1 ? <p style={{ marginTop: 8, color: "#666660", fontSize: 13 }}>Lotes sempre usam 1 acesso por link para preservar identidade e rastreabilidade individual.</p> : null}
      {error ? <p className="flow-error" role="alert" style={{ marginTop: 14 }}>{error}</p> : null}

      {createdUrls.length > 0 ? (
        <div className="home-next-card" style={{ marginTop: 14, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">{createdUrls.length} link{createdUrls.length === 1 ? "" : "s"} gerado{createdUrls.length === 1 ? "" : "s"} · copie agora</p>
            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
              {createdUrls.map((url, index) => <code key={url} style={{ wordBreak: "break-all" }}>{String(index + 1).padStart(2, "0")} · {url}</code>)}
            </div>
          </div>
          <button className="secondary" type="button" onClick={copyAll}>{createdUrls.length > 1 ? "Copiar todos" : "Copiar"}</button>
        </div>
      ) : null}

      <div style={{ overflowX: "auto", marginTop: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead><tr><th align="left">Convite</th><th align="left">Status</th><th align="right">Usos</th><th align="right">Expira</th><th /></tr></thead>
          <tbody>{invites.map((invite) => (
            <tr key={invite.id}>
              <td style={{ padding: "12px 0", borderTop: "1px solid #e5e5df" }}>{invite.label}</td>
              <td style={{ borderTop: "1px solid #e5e5df" }}>{invite.status}</td>
              <td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{invite.uses}/{invite.maxUses}</td>
              <td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString("pt-BR") : "—"}</td>
              <td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{invite.status === "ACTIVE" ? <button className="secondary" type="button" onClick={() => revoke(invite.id)}>Revogar</button> : null}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
