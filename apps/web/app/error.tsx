"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flow-shell" role="alert">
      <section className="flow-card">
        <p className="eyebrow">Recuperação</p>
        <h1 className="flow-title">Algo interrompeu esta etapa.</h1>
        <p className="lead compact">Seu trabalho já salvo permanece preservado. Você pode tentar carregar esta tela novamente.</p>
        <div className="flow-actions"><button className="primary" type="button" onClick={() => reset()}>Tentar novamente</button></div>
      </section>
    </main>
  );
}
