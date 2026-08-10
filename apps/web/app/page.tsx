import Link from "next/link";
import { getActivationRepository } from "../server/runtime";
import { getLearnerProfile } from "../server/learner-profile";
import { getSessionUserId } from "../server/session";

export const dynamic = "force-dynamic";

const modules = [
  ["Aprender", "Aulas passo a passo e trilhas estruturadas.", "/learn", "learn", "▤"],
  ["Treinar", "Exercícios diários para fortalecer sua habilidade.", "/gym", "gym", "─"],
  ["Observar", "Percepção, análise e sensibilidade visual.", "/observation", "observe", "◉"],
  ["Construir", "Forma, volume, luz e estrutura.", "/construction", "construct", "◇"],
  ["Criar", "Estudos, projetos e obras próprias.", "/create", "create", "✎"],
  ["Jornada", "Evolução, evidências e marcos conquistados.", "/journey", "journey", "⌖"],
] as const;

const pathLabels: Record<string, string> = { MANGA: "Mangá", COMIC: "Comic", REALISTIC: "Realista", EXPLORE: "Exploração" };

export default async function HomePage() {
  const userId = await getSessionUserId();
  const profile = userId ? await getLearnerProfile(userId) : null;
  const activation = userId ? await getActivationRepository().getSnapshot(userId) : null;
  const primary = activation?.nextAction ?? { title: "Começar minha jornada", description: "Onboarding · cerca de 2 minutos", href: "/onboarding" };
  const progress = activation ? Math.round((activation.completedSteps / Math.max(1, activation.totalSteps)) * 100) : 0;
  const headline = profile?.onboardingComplete && profile.displayName
    ? `${profile.displayName}, continue construindo habilidade.`
    : "Aprenda a desenhar com propósito e consistência.";

  return (
    <main className="shell home-v11">
      <section className="home-v11-hero">
        <div className="home-v11-copy">
          <p className="eyebrow">Sua jornada artística começa aqui</p>
          <h1>{headline}</h1>
          <p className="lead">Um caminho claro, exercícios inteligentes e prática deliberada para transformar seu olhar em arte.</p>
          <div className="actions">
            <Link href={primary.href} className="primary home-cta">{primary.title} <span aria-hidden="true">→</span></Link>
            <Link href="/learn" className="secondary link-button">Explorar o método</Link>
          </div>
        </div>
        <aside className="home-v11-art" aria-label="Estudos fundamentais de desenho">
          <div className="art-plate art-plate-main"><span>FORMA</span><strong>Volume</strong><small>estrutura · plano · espaço</small></div>
          <div className="art-plate art-plate-eye"><span>OLHAR</span><strong>Percepção</strong><small>proporção · relação · ritmo</small></div>
          <div className="art-plate art-plate-hand"><span>GESTO</span><strong>Controle</strong><small>linha · pressão · intenção</small></div>
        </aside>
      </section>

      <section className="home-v11-modules" aria-label="Áreas de aprendizagem">
        {modules.map(([title, description, href, tone, glyph]) => (
          <Link href={href} className={`home-v11-module module-${tone}`} key={title}>
            <span className="module-glyph" aria-hidden="true">{glyph}</span>
            <strong>{title}</strong><p>{description}</p><b aria-hidden="true">→</b>
          </Link>
        ))}
      </section>

      <section className="home-v11-dashboard">
        <article className="home-v11-resume">
          <div className="resume-visual" aria-hidden="true"><span /><i /><b /></div>
          <div className="resume-content">
            <p className="eyebrow">Continue de onde parou</p>
            <h2>{primary.title}</h2>
            <p>{primary.description}</p>
            {activation && profile?.onboardingComplete ? (
              <>
                <div className="resume-progress"><span><i style={{ width: `${progress}%` }} /></span><b>{progress}%</b></div>
                <p className="resume-meta">Etapas <strong>{activation.completedSteps}/{activation.totalSteps}</strong> · Direção <strong>{pathLabels[profile.preferredPath ?? ""] ?? "Exploração"}</strong></p>
              </>
            ) : <p className="resume-meta">Primeiro passo: configure sua direção artística e faça o Drawing Zero.</p>}
            <div className="actions"><Link className="primary link-button" href={primary.href}>Continuar</Link><Link className="secondary link-button" href="/resume">Ver jornada</Link></div>
          </div>
        </article>

        <aside className="home-v11-next">
          <p className="eyebrow">Próximos passos</p>
          <ol>
            <li><span>01</span><div><strong>Defina sua direção</strong><small>Onboarding e objetivo pessoal</small></div></li>
            <li><span>02</span><div><strong>Drawing Zero</strong><small>Registre seu ponto de partida</small></div></li>
            <li><span>03</span><div><strong>Comece o ciclo</strong><small>Linha, observação e construção</small></div></li>
          </ol>
          <Link href="/learn" className="secondary link-button">Ver plano completo</Link>
        </aside>
      </section>

      <section className="home-v11-metrics" aria-label="Resumo da jornada">
        <div><strong>{activation?.completedSteps ?? 0}</strong><span>etapas concluídas</span></div>
        <div><strong>{activation?.totalSteps ?? 0}</strong><span>etapas no ciclo atual</span></div>
        <div><strong>{profile?.onboardingComplete ? "Ativa" : "Inicial"}</strong><span>fase da jornada</span></div>
        <div><strong>{pathLabels[profile?.preferredPath ?? ""] ?? "Exploração"}</strong><span>direção artística</span></div>
      </section>
    </main>
  );
}
