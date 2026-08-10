import Link from "next/link";
import { getActivationRepository } from "../server/runtime";
import { getLearnerProfile } from "../server/learner-profile";
import { getSessionUserId } from "../server/session";

export const dynamic = "force-dynamic";

const pillars = [
  ["Learn", "Aulas passo a passo e trilhas estruturadas.", "/learn", "learn"],
  ["Gym", "Treine movimentos essenciais todos os dias.", "/gym", "gym"],
  ["Create", "Crie artes, estudos e projetos reais.", "/create", "create"],
  ["Journey", "Veja sua evolução e conquiste marcos.", "/journey", "journey"],
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
  const primary = activation?.nextAction ?? { title: "Começar minha jornada", description: "Onboarding · 2 minutos", href: "/onboarding" };
  const headline = profile?.onboardingComplete && profile.displayName
    ? `${profile.displayName}, continue construindo habilidade.`
    : "Aprenda a desenhar construindo habilidade de verdade.";

  return (
    <main className="shell home-v1">
      <section className="home-v1-hero">
        <div className="home-v1-copy">
          <p className="eyebrow">Sua jornada artística começa aqui</p>
          <h1>{headline}</h1>
          <p className="lead">Um caminho claro, exercícios inteligentes e prática deliberada para transformar seu olhar em arte.</p>
          <div className="actions">
            <Link href={primary.href} className="primary home-cta">{primary.title} <span aria-hidden="true">→</span></Link>
            <Link href="/learn" className="secondary link-button">Explorar o método</Link>
          </div>
        </div>
        <aside className="home-v1-study" aria-label="Estudo visual do método">
          <div className="study-orbit study-orbit-one" />
          <div className="study-orbit study-orbit-two" />
          <div className="study-axis" />
          <div className="study-bust" aria-hidden="true"><span /><i /><b /></div>
          <div className="study-note"><strong>Observe</strong><span>proporção · gesto · forma · volume</span></div>
        </aside>
      </section>

      {activation && profile?.onboardingComplete ? (
        <section className="home-next-card home-resume-v1">
          <div className="resume-art" aria-hidden="true"><span /></div>
          <div className="resume-copy">
            <p className="eyebrow">Retome sua jornada</p>
            <h2>{primary.title}</h2>
            <p>{primary.description}</p>
            <p className="resume-meta">Ativação <strong>{activation.completedSteps}/{activation.totalSteps}</strong> · Direção <strong>{pathLabels[profile.preferredPath ?? ""] ?? "Exploração"}</strong></p>
          </div>
          <Link className="primary link-button" href="/resume">Continuar</Link>
        </section>
      ) : null}

      <section className="grid home-pillars-v1" aria-label="Áreas do produto">
        {pillars.map(([title, description, href, tone]) => (
          <Link href={href} className={`card home-card-link home-pillar-${tone}`} key={title}>
            <span className="pillar-mark" aria-hidden="true" />
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="pillar-line" aria-hidden="true" />
          </Link>
        ))}
      </section>
    </main>
  );
}
