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

export function InviteManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/ops/invites", { cache: "no-store" });
    if (response.ok) setInvites((await response.json()).invites);
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setCreatedUrl(null);
    const response = await fetch("/api/ops/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, maxUses, expiresInDays }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) return;
    const url = `${window.location.origin}/join/${payload.code}`;
    setCreatedUrl(url);
    setLabel("");
    await load();
  }

  async function revoke(id: string) {
    await fetch("/api/ops/invites", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <section style={{ marginTop: 36 }}>
      <p className="eyebrow">Convites do Closed Alpha</p>
      <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 2fr) repeat(2, minmax(100px, 1fr)) auto", gap: 10, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}><small>Identificação</small><input value={label} onChange={(e) => setLabel(e.target.value)} required minLength={2} maxLength={120} placeholder="Tester / turma / parceiro" /></label>
        <label style={{ display: "grid", gap: 6 }}><small>Usos</small><input type="number" min={1} max={100} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} /></label>
        <label style={{ display: "grid", gap: 6 }}><small>Validade (dias)</small><input type="number" min={1} max={90} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} /></label>
        <button className="primary" disabled={loading} type="submit">{loading ? "Criando…" : "Novo convite"}</button>
      </form>

      {createdUrl ? (
        <div className="home-next-card" style={{ marginTop: 14 }}>
          <div><p className="eyebrow">Link gerado · copie agora</p><code style={{ wordBreak: "break-all" }}>{createdUrl}</code></div>
          <button className="secondary" type="button" onClick={() => navigator.clipboard.writeText(createdUrl)}>Copiar</button>
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
