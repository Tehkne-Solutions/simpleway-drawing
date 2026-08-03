"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinInvite({ code }: { code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/invites/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(response.status === 410 ? "Este convite expirou ou já foi utilizado." : "Não foi possível validar o convite.");
      return;
    }
    router.replace(payload.next ?? "/onboarding");
    router.refresh();
  }

  return (
    <section className="flow-card" style={{ maxWidth: 620, margin: "10vh auto" }}>
      <p className="eyebrow">SimpleWay Drawing · Closed Alpha</p>
      <h1 className="flow-title">Seu convite está pronto.</h1>
      <p className="lead compact">Você está entrando em uma versão fechada de teste. Sua jornada, prática e feedback ajudarão a validar o método antes da abertura pública.</p>
      {error ? <p role="alert" style={{ color: "#9b1c1c" }}>{error}</p> : null}
      <button className="primary" type="button" disabled={loading} onClick={join} style={{ marginTop: 20 }}>
        {loading ? "Validando convite…" : "Entrar no Closed Alpha"}
      </button>
      <p style={{ marginTop: 18, opacity: .7, fontSize: 13 }}>Acesso individual e controlado · Tehkné Solutions</p>
    </section>
  );
}
