import Link from "next/link";
import { getActivationRepository } from "../server/runtime";
import { getLearnerProfile } from "../server/learner-profile";
import { getSessionUserId } from "../server/session";

export const dynamic = "force-dynamic";

const pillars = [
  ["Learn", "Fundamentos organizados em ciclos curtos e ativos.", "/learn"],
  ["Gym", "Prática deliberada baseada nas habilidades que precisam evoluir.", "/gym"],
  ["Create", "Transforme fundamentos em estudos, projetos e arte autoral.", "/create"],
  ["Journey", "Veja evidências reais da sua evolução artística.", "/journey"],
] as const;

const pathLabels: Record<string, string> = {
  MANGA: "Mangá",
  COMIC: "Comic",
  REALISTIC: "Realista",
  EXPLORE: "Exploração",
};

export default async function HomePage() {
  const userId = await getSessionUserId();
  const profile = userId ? await getLearnerProfile(userId) : null;
  const activation = userId ? await getActivationRepository().getSnapshot(userId) : null;
  const primary = activation?.nextAction ?? { title: "Definir meu ponto de partida", description: "Onboarding · 2 minutos", href: "/onboarding" };

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">SimpleWay Drawing</p>
        <h1>{profile?.onboardingComplete && profile.displayName ? `${profile.displayName}, continue construindo habilidade.` : "Aprenda a desenhar construindo habilidade de verdade."}</h1>
        <p className="lead">Aprenda, desenhe, pratique, corrija e crie. O sistema transforma cada etapa em uma jornada clara de evolução.</p>
        <div className="actions">
          <Link href={primary.href} className="primary home-cta">{primary.title}</Link>
          <span>{primary.description}</span>
        </div>
      </section>

      {activation && profile?.onboardingComplete ? (
        <section className="home-next-card">
          <div>
            <p className="eyebrow">HNK · Retomar</p>
            <h2>{primary.title}</h2>
            <p>{primary.description}</p>
            <p>Ativação: <strong>{activation.completedSteps}/{activation.totalSteps}</strong> · Direção futura: <strong>{pathLabels[profile.preferredPath ?? ""] ?? "Exploração"}</strong>.</p>
          </div>
          <Link className="secondary link-button" href="/resume">Ver minha continuidade</Link>
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
