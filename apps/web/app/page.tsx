import Link from "next/link";
import { CromaCoach } from "./components/croma-coach";
import { getActivationRepository } from "../server/runtime";
import { getLearnerProfile } from "../server/learner-profile";
import { getSessionUserId } from "../server/session";

export const dynamic = "force-dynamic";

const modules = [
  ["Missões do Codex", "Aprenda fundamentos por missões curtas, demonstrações e checkpoints.", "/learn", "learn", "▤"],
  ["Atelier do Gesto", "Treine linha, curva, elipse, ritmo e intenção de movimento.", "/gym", "gym", "─"],
  ["Atelier do Olhar", "Percepção, proporção, relações e leitura visual.", "/observation", "observe", "◉"],
  ["Atelier da Estrutura", "Construa formas, volumes e espaço antes dos detalhes.", "/construction", "construct", "◇"],
  ["Atelier Livre", "Entre nos canvases de prática e criação do SWD.", "/create", "create", "✎"],
  ["Atlas do Olhar", "Veja evidências, marcos, domínio e sua próxima missão.", "/journey", "journey", "⌖"],
] as const;

const pathLabels: Record<string, string> = { MANGA: "Mangá", COMIC: "Comic", REALISTIC: "Realista", EXPLORE: "Exploração" };

export default async function HomePage() {
  const userId = await getSessionUserId();
  const profile = userId ? await getLearnerProfile(userId) : null;
  const activation = userId ? await getActivationRepository().getSnapshot(userId) : null;
  const primary = activation?.nextAction ?? { title: "Começar minha jornada", description: "Onboarding · cerca de 2 minutos", href: "/onboarding" };
  const progress = activation ? Math.round((activation.completedSteps / Math.max(1, activation.totalSteps)) * 100) : 0;
  const headline = profile?.onboardingComplete && profile.displayName
    ? `${profile.displayName}, o Atelier está aberto.`
    : "Treine o olhar. Domine o gesto. Construa mundos.";

  return (
    <main className="shell home-v11">
      <section className="home-v11-hero">
        <div className="home-v11-copy">
          <p className="eyebrow">Sociedade Croma · SimpleWay Drawing</p>
          <h1>{headline}</h1>
          <p className="lead">Um game de treino artístico em que cada tentativa produz evidência, cada Atelier desenvolve uma habilidade e cada criação desenha seu Atlas.</p>
          <div className="actions">
            <Link href={primary.href} className="primary home-cta">{primary.title} <span aria-hidden="true">→</span></Link>
            <Link href="/codex" className="secondary link-button">Abrir Codex Croma</Link>
          </div>
        </div>
        <aside className="home-v11-art" aria-label="Mesa de estudos do Atelier">
          <div className="art-plate art-plate-main"><span>ESTRUTURA</span><strong>Volume</strong><small>forma · plano · espaço</small></div>
          <div className="art-plate art-plate-eye"><span>OLHAR</span><strong>Percepção</strong><small>proporção · relação · ritmo</small></div>
          <div className="art-plate art-plate-hand"><span>GESTO</span><strong>Controle</strong><small>linha · pressão · intenção</small></div>
        </aside>
      </section>

      <div className="home-game-ribbon">
        <div><strong>Missão jogável: Cubo no Espaço</strong><p>Entre no Canvas Isométrico, use a grade 30° e construa uma forma tridimensional sem depender de upload.</p></div>
        <Link href="/create/isometric">Jogar agora →</Link>
      </div>

      <CromaCoach
        eyebrow="Croma · Herdeiro do Olhar"
        title="Não tente desenhar tudo de uma vez."
        message="Escolha uma habilidade, produza uma tentativa e deixe o sistema mostrar o próximo problema. Prima osserva. Poi crea."
        actionLabel="Ver minha próxima missão"
        actionHref={primary.href}
        tone="gold"
      />

      <section className="home-v11-modules" aria-label="Ateliers e sistemas do jogo">
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
            <p className="eyebrow">Missão em andamento</p>
            <h2>{primary.title}</h2>
            <p>{primary.description}</p>
            {activation && profile?.onboardingComplete ? (
              <>
                <div className="resume-progress"><span><i style={{ width: `${progress}%` }} /></span><b>{progress}%</b></div>
                <p className="resume-meta">Etapas <strong>{activation.completedSteps}/{activation.totalSteps}</strong> · Direção <strong>{pathLabels[profile.preferredPath ?? ""] ?? "Exploração"}</strong></p>
              </>
            ) : <p className="resume-meta">Primeiro passo: escolha sua direção artística e registre seu Drawing Zero.</p>}
            <div className="actions"><Link className="primary link-button" href={primary.href}>Continuar missão</Link><Link className="secondary link-button" href="/journey">Abrir Atlas</Link></div>
          </div>
        </article>

        <aside className="home-v11-next">
          <p className="eyebrow">Ritual do Olhar</p>
          <ol>
            <li><span>01</span><div><strong>Observe</strong><small>Procure relações antes de nomes.</small></div></li>
            <li><span>02</span><div><strong>Tente</strong><small>Produza evidência, não perfeição.</small></div></li>
            <li><span>03</span><div><strong>Compare e corrija</strong><small>Transforme erro em próxima ação.</small></div></li>
          </ol>
          <Link href="/codex" className="secondary link-button">Ler o Codex</Link>
        </aside>
      </section>

      <section className="home-v11-metrics" aria-label="Resumo da jornada">
        <div><strong>{activation?.completedSteps ?? 0}</strong><span>etapas demonstradas</span></div>
        <div><strong>{activation?.totalSteps ?? 0}</strong><span>etapas no arco atual</span></div>
        <div><strong>{profile?.onboardingComplete ? "Ativa" : "Inicial"}</strong><span>fase da jornada</span></div>
        <div><strong>{pathLabels[profile?.preferredPath ?? ""] ?? "Exploração"}</strong><span>direção artística</span></div>
      </section>
    </main>
  );
}
