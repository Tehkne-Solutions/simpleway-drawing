"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinInvite({ code, consentVersion }: { code: string; consentVersion: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!accepted) {
      setError("Para entrar no Closed Alpha, confirme que leu e aceita o uso dos dados descrito abaixo.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await fetch("/api/invites/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, consentAccepted: true, consentVersion }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(response.status === 410 ? "Este convite expirou ou já foi utilizado." : payload.code === "CONSENT_REQUIRED" ? "O consentimento precisa ser confirmado novamente." : "Não foi possível validar o convite.");
      return;
    }
    router.replace(payload.next ?? "/onboarding");
    router.refresh();
  }

  return (
    <section className="flow-card" style={{ maxWidth: 680, margin: "8vh auto" }}>
      <p className="eyebrow">SimpleWay Drawing · Closed Alpha</p>
      <h1 className="flow-title">Seu convite está pronto.</h1>
      <p className="lead compact">Você está entrando em uma versão fechada de teste. Sua jornada, prática e feedback ajudarão a validar o método antes da abertura pública.</p>

      <div className="card" style={{ minHeight: 0, marginTop: 22 }}>
        <p className="eyebrow">Privacidade do Alpha</p>
        <p>Registramos progresso de aprendizagem, atividades necessárias para diagnosticar o fluxo, artworks que você optar por enviar e feedbacks. O conteúdo das artes não aparece no painel operacional de suporte.</p>
        <p><Link href="/privacy">Ler como seus dados são usados e como exportá-los</Link></p>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14 }}>
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} style={{ marginTop: 4 }} />
          <span>Li as informações do Closed Alpha e concordo com o tratamento desses dados para aprendizagem, operação do teste e melhoria do produto.</span>
        </label>
      </div>

      {error ? <p role="alert" style={{ color: "#9b1c1c" }}>{error}</p> : null}
      <button className="primary" type="button" disabled={loading || !accepted} onClick={join} style={{ marginTop: 20 }}>
        {loading ? "Validando convite…" : "Aceitar e entrar no Closed Alpha"}
      </button>
      <p style={{ marginTop: 18, opacity: .7, fontSize: 13 }}>Consentimento {consentVersion} · acesso individual e controlado · Tehkné Solutions</p>
    </section>
  );
}
