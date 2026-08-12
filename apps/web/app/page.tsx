import Link from "next/link";
import { getActivationRepository } from "../server/runtime";
import { getLearnerProfile } from "../server/learner-profile";
import { getSessionUserId } from "../server/session";

export const dynamic = "force-dynamic";

const systems = [
  ["Campanha", "/learn", "campaign", "▤"],
  ["Gesto", "/gym", "gesture", "─"],
  ["Olhar", "/observation", "vision", "◉"],
  ["Estrutura", "/construction", "structure", "◇"],
  ["Volume", "/form", "volume", "○"],
  ["Atlas", "/journey", "atlas", "⌖"],
] as const;

const pathLabels: Record<string, string> = { MANGA: "Mangá", COMIC: "Comic", REALISTIC: "Realista", EXPLORE: "Exploração" };

export default async function HomePage() {
  const userId = await getSessionUserId();
  const profile = userId ? await getLearnerProfile(userId) : null;
  const activation = userId ? await getActivationRepository().getSnapshot(userId) : null;
  const primary = activation?.nextAction ?? { title: "Começar minha jornada", description: "Onboarding · cerca de 2 minutos", href: "/onboarding" };
  const progress = activation ? Math.round((activation.completedSteps / Math.max(1, activation.totalSteps)) * 100) : 0;
  const direction = pathLabels[profile?.preferredPath ?? ""] ?? "Exploração";

  return (
    <main className="player-hub">
      <section className="player-command-deck">
        <div className="player-command-main">
          <p className="eyebrow">Sociedade Croma · Hub do Jogador</p>
          <div className="player-command-title">
            <div>
              <h1>{profile?.displayName ? `${profile.displayName}, seu Atelier está aberto.` : "Aprendiz do Olhar"}</h1>
              <p>Entre, pratique uma habilidade e saia com uma evidência nova. O SWD mede evolução pelo que você faz.</p>
            </div>
            <Link className="hub-codex-link" href="/codex">C <span>Codex</span></Link>
          </div>

          <div className="hub-active-mission">
            <div className="hub-active-badge"><span>MISSÃO ATIVA</span><b>{progress}%</b></div>
            <div className="hub-active-copy"><strong>{primary.title}</strong><p>{primary.description}</p></div>
            <Link className="hub-play-button" href={primary.href}>Continuar <span>→</span></Link>
          </div>
        </div>

        <aside className="hub-croma-panel">
          <div className="hub-croma-avatar" aria-hidden="true"><span>◉</span><b>↻</b></div>
          <div><span>CROMA · COACH</span><strong>Escolha um problema pequeno.</strong><p>Observe. Tente. Compare. Corrija. Uma boa sessão termina com uma pergunta melhor do que começou.</p></div>
          <Link href="/learn">Abrir campanha →</Link>
        </aside>
      </section>

      <section className="hub-play-zone" aria-labelledby="play-zone-title">
        <div className="hub-section-heading"><div><p className="eyebrow">Jogar agora</p><h2 id="play-zone-title">Studios ativos</h2></div><Link href="/create">Ver Atelier Livre</Link></div>
        <div className="hub-studios">
          <Link className="hub-studio-card manga" href="/create/manga">
            <span>ATELIER DA NARRATIVA</span><strong>Manga Canvas</strong><p>Construa cabeça e rosto em frente, 3/4 e perfil usando guias de volume.</p><b>Entrar no Studio →</b>
            <div className="studio-emblem" aria-hidden="true">頭</div>
          </Link>
          <Link className="hub-studio-card iso" href="/create/isometric">
            <span>ATELIER DA ESTRUTURA</span><strong>Canvas Isométrico</strong><p>Treine espaço 3D em 2D com grade 30°, snap e construção por segmentos.</p><b>Entrar no Studio →</b>
            <div className="studio-emblem iso-emblem" aria-hidden="true">◇</div>
          </Link>
        </div>
      </section>

      <section className="hub-systems" aria-label="Sistemas do SimpleWay Drawing">
        {systems.map(([title, href, tone, glyph]) => <Link key={title} className={`hub-system hub-${tone}`} href={href}><span aria-hidden="true">{glyph}</span><strong>{title}</strong><b>→</b></Link>)}
      </section>

      <section className="hub-status-strip">
        <div><span>ARCO</span><strong>{profile?.onboardingComplete ? "Foundation ativa" : "Início da jornada"}</strong></div>
        <div><span>DIREÇÃO</span><strong>{direction}</strong></div>
        <div><span>EVIDÊNCIA</span><strong>{activation?.completedSteps ?? 0}/{activation?.totalSteps ?? 0} etapas</strong></div>
        <div><span>PRÓXIMO SISTEMA</span><Link href="/journey">Atlas do Olhar →</Link></div>
      </section>
    </main>
  );
}
