import Link from "next/link";
import { getLearnerProfile } from "../server/learner-profile";
import { getPlayerContinuity } from "../server/player-continuity";
import { getSessionUserId } from "../server/session";
import { CromaMark, type CromaPigment, type CromaState } from "./components/croma-mark";

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

function territoryState(complete: boolean, evidenceCount: number) {
  return complete ? "CONSAGRADO" : evidenceCount > 0 ? "EM CURSO" : "ABERTO";
}

export default async function HomePage() {
  const userId = await getSessionUserId();
  const [profile, continuity] = userId
    ? await Promise.all([getLearnerProfile(userId), getPlayerContinuity(userId)])
    : [null, null];
  const primary = continuity?.nextAction ?? { title: "Começar minha jornada", description: "Onboarding · cerca de 2 minutos", href: "/onboarding", kind: "foundation" as const };
  const progress = continuity ? Math.round(continuity.focusProgress * 100) : 0;
  const direction = pathLabels[profile?.preferredPath ?? ""] ?? "Exploração";
  const territoryByKey = new Map(continuity?.territories.map((territory) => [territory.key, territory]) ?? []);
  const synthesis = territoryByKey.get("synthesis");
  const narrative = territoryByKey.get("narrative");
  const structure = territoryByKey.get("structure");
  const phase = continuity?.phase ?? "FOUNDATION";
  const cromaState: CromaState = phase === "AUTHORING" ? "celebrate" : phase === "CREATIVE_WORLD" ? "guide" : "challenge";
  const cromaPigment: CromaPigment = phase === "AUTHORING" ? "violet" : phase === "CREATIVE_WORLD" ? "ultramarine" : "terracotta";
  const cromaTitle = phase === "AUTHORING" ? "Junte o que você aprendeu." : phase === "CREATIVE_WORLD" ? "Continue o fio que já começou." : "Escolha um problema pequeno.";
  const cromaText = phase === "AUTHORING"
    ? "Os territórios medidos já responderam. Agora use as habilidades juntas e construa uma obra que não seja apenas um exercício."
    : phase === "CREATIVE_WORLD"
      ? "A Foundation está demonstrada. Escolha um território, produza Evidence e deixe o Atlas registrar sua linguagem em formação."
      : "Observe. Tente. Compare. Corrija. Uma boa sessão termina com uma pergunta melhor do que começou.";

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
            <div className="hub-active-badge"><span>{continuity?.phaseTitle ?? "MISSÃO ATIVA"}</span><b>{progress}%</b></div>
            <div className="hub-active-copy"><strong>{primary.title}</strong><p>{primary.description}</p></div>
            <Link className="hub-play-button" href={primary.href}>Continuar <span>→</span></Link>
          </div>
        </div>

        <aside className="hub-croma-panel" data-croma-state={cromaState} data-croma-pigment={cromaPigment}>
          <div className="hub-croma-avatar"><CromaMark state={cromaState} pigment={cromaPigment} label={`Croma: ${cromaTitle}`} /></div>
          <div><span>CROMA · BÚSSOLA</span><strong>{cromaTitle}</strong><p>{cromaText}</p></div>
          <Link href="/resume">Abrir minha rota →</Link>
        </aside>
      </section>

      <section className="hub-play-zone" aria-labelledby="play-zone-title">
        <div className="hub-section-heading"><div><p className="eyebrow">Jogar agora</p><h2 id="play-zone-title">Territórios ativos</h2></div><Link href="/create">Ver Atelier Livre</Link></div>
        <div className="hub-studios">
          <Link className="hub-studio-card manga" href="/create/manga">
            <span>ATELIER DA NARRATIVA · {territoryState(Boolean(narrative?.complete), narrative?.evidenceCount ?? 0)}</span><strong>Manga Canvas</strong><p>Construa cabeça e rosto em frente, 3/4 e perfil usando guias de volume.</p><b>{narrative?.complete ? "Revisitar território →" : narrative?.evidenceCount ? "Continuar território →" : "Entrar no Studio →"}</b>
            <div className="studio-emblem" aria-hidden="true">頭</div>
          </Link>
          <Link className="hub-studio-card iso" href="/create/isometric">
            <span>ATELIER DA ESTRUTURA · {territoryState(Boolean(structure?.complete), structure?.evidenceCount ?? 0)}</span><strong>Canvas Isométrico</strong><p>Treine espaço 3D em 2D com grade 30°, snap e construção por segmentos.</p><b>{structure?.complete ? "Revisitar território →" : structure?.evidenceCount ? "Continuar território →" : "Entrar no Studio →"}</b>
            <div className="studio-emblem iso-emblem" aria-hidden="true">◇</div>
          </Link>
          <Link className="hub-studio-card pixel" href="/create/pixel/quest">
            <span>ATELIER DA SÍNTESE · {territoryState(Boolean(synthesis?.complete), synthesis?.evidenceCount ?? 0)}</span><strong>Expedição da Síntese</strong><p>Quatro missões conectam Pixel Studio, Sprite Lab, Tile Lab e Animation Lab em um único arco jogável.</p><b>{synthesis?.complete ? "Revisitar expedição →" : synthesis?.evidenceCount ? `Continuar expedição · ${synthesis.completedSteps}/${synthesis.totalSteps} →` : "Abrir mapa da expedição →"}</b>
            <div className="studio-emblem pixel-emblem" aria-hidden="true">▦</div>
          </Link>
        </div>
      </section>

      <section className="hub-systems" aria-label="Sistemas do SimpleWay Drawing">
        {systems.map(([title, href, tone, glyph]) => <Link key={title} className={`hub-system hub-${tone}`} href={href}><span aria-hidden="true">{glyph}</span><strong>{title}</strong><b>→</b></Link>)}
      </section>

      <section className="hub-status-strip">
        <div><span>ARCO ATUAL</span><strong>{continuity?.phaseTitle ?? "Início da jornada"}</strong></div>
        <div><span>DIREÇÃO</span><strong>{direction}</strong></div>
        <div><span>TERRITÓRIOS</span><strong>{continuity ? `${continuity.creative.completed}/${continuity.creative.total} consagrados` : "0/3 consagrados"}</strong></div>
        <div><span>PRÓXIMA ROTA</span><Link href={primary.href}>{primary.title} →</Link></div>
      </section>
    </main>
  );
}
