import Link from "next/link";

const pillars = [
  ["Learn", "Fundamentos organizados em ciclos curtos e ativos.", "/learn"],
  ["Gym", "Prática deliberada baseada nas habilidades que precisam evoluir.", "/gym"],
  ["Create", "Transforme fundamentos em estudos, projetos e arte autoral.", "/drawing-zero"],
  ["Journey", "Veja evidências reais da sua evolução artística.", "/journey"],
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
          <Link href="/learn" className="primary home-cta">Começar minha jornada</Link>
          <span>C0 · I Can Draw</span>
        </div>
      </section>

      <section className="grid" aria-label="Áreas do produto">
        {pillars.map(([title, description, href]) => (
          <Link href={href} className="card home-card-link" key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </Link>
        ))}
      </section>

      <footer>Tehkné Solutions</footer>
    </main>
  );
}
