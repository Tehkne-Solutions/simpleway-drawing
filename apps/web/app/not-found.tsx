import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flow-shell">
      <section className="flow-card">
        <p className="eyebrow">404</p>
        <h1 className="flow-title">Esta etapa não foi encontrada.</h1>
        <p className="lead compact">Volte para a Home para continuar do ponto certo da sua jornada.</p>
        <div className="flow-actions"><Link className="primary link-button" href="/">Ir para a Home</Link></div>
      </section>
    </main>
  );
}
