import Link from "next/link";
import { getAlphaRepository } from "../server/runtime";
import { getSessionUserId } from "../server/session";

export const dynamic = "force-dynamic";

const pillars = [
  ["Learn", "Fundamentos organizados em ciclos curtos e ativos.", "/learn"],
  ["Gym", "Prática deliberada baseada nas habilidades que precisam evoluir.", "/gym"],
  ["Create", "Transforme fundamentos em estudos, projetos e arte autoral.", "/create"],
  ["Journey", "Veja evidências reais da sua evolução artística.", "/journey"],
] as const;

export default async function HomePage() {
  const userId = await getSessionUserId();
  const snapshot = userId ? await getAlphaRepository().getSnapshot(userId) : null;
  const primary = snapshot?.nextAction ?? { title: "Começar minha jornada", description: "C0 · I Can Draw", href: "/learn" };

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">SimpleWay Drawing</p>
        <h1>Aprenda a desenhar construindo habilidade de verdade.</h1>
        <p className="lead">Aprenda, desenhe, pratique, corrija e crie. O sistema transforma cada etapa em uma jornada clara de evolução.</p>
        <div className="actions">
          <Link href={primary.href} className="primary home-cta">{primary.title}</Link>
          <span>{primary.description}</span>
        </div>
      </section>

      {snapshot ? (
        <section className="home-next-card">
          <div><p className="eyebrow">HNK · Próxima ação</p><h2>{primary.title}</h2><p>{primary.description}</p></div>
          <Link className="secondary link-button" href="/alpha">Abrir Alpha Gate</Link>
        </section>
      ) : null}

      <section className="grid" aria-label="Áreas do produto">
        {pillars.map(([title, description, href]) => (
          <Link href={href} className="card home-card-link" key={title}><h2>{title}</h2><p>{description}</p></Link>
        ))}
      </section>
    </main>
  );
}
