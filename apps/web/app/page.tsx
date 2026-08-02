const pillars = [
  ["Learn", "Fundamentos organizados em ciclos curtos e ativos."],
  ["Gym", "Prática deliberada baseada nas habilidades que precisam evoluir."],
  ["Create", "Transforme fundamentos em estudos, projetos e arte autoral."],
  ["Journey", "Veja evidências reais da sua evolução artística."],
] as const;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">SimpleWay Drawing</p>
        <h1>Aprenda a desenhar construindo habilidade de verdade.</h1>
        <p className="lead">
          Aprenda, desenhe, pratique, corrija e crie. O sistema transforma cada etapa em uma jornada clara de evolução.
        </p>
        <div className="actions">
          <button type="button" className="primary">Começar minha jornada</button>
          <span>C0 · I Can Draw</span>
        </div>
      </section>

      <section className="grid" aria-label="Áreas do produto">
        {pillars.map(([title, description]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <footer>Tehkné Solutions</footer>
    </main>
  );
}
