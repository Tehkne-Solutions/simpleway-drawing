import Link from "next/link";
import { getAlphaRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import { AlphaGateButton } from "./alpha-client";

export const dynamic = "force-dynamic";

const statusLabel = {
  NOT_READY: "Em progresso",
  SUPPORT_REQUIRED: "Suporte necessário",
  READY_WITH_REVIEW: "Pronto com revisão",
  READY: "Pronto",
} as const;

export default async function AlphaPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    return <main className="flow-shell"><section className="flow-card"><p className="eyebrow">Foundation Alpha</p><h1 className="flow-title">Sua integração começa depois do primeiro passo.</h1><p className="lead compact">Inicie sua jornada para que o sistema consiga reunir progresso, Evidence e criação.</p><div className="flow-actions"><Link className="primary link-button" href="/learn">Começar</Link></div></section></main>;
  }

  const snapshot = await getAlphaRepository().getSnapshot(userId);
  const ready = snapshot.status === "READY" || snapshot.status === "READY_WITH_REVIEW";

  return (
    <main className="flow-shell">
      <section className="flow-card alpha-card">
        <div className="alpha-hero">
          <div><p className="eyebrow">Foundation Alpha · Integration Gate</p><h1 className="flow-title">Observe → controle → simplifique → construa → crie.</h1></div>
          <span className={`alpha-status status-${snapshot.status.toLowerCase()}`}>{statusLabel[snapshot.status]}</span>
        </div>
        <p className="lead compact">Este gate não olha conclusão isolada. Ele reúne currículo, Evidence de quatro domínios, Drawing Zero revisitado e uma criação integradora.</p>

        <div className="alpha-requirements">
          <article><span>{snapshot.c4Completed ? "✓" : "○"}</span><div><strong>C0–C4</strong><p>Foundation curricular concluída.</p></div></article>
          <article><span>{snapshot.hasDrawingZeroRevisit ? "✓" : "○"}</span><div><strong>Drawing Zero Revisited</strong><p>Mesmo desafio do baseline para comparação Before/After.</p></div></article>
          <article><span>{snapshot.hasCapstone ? "✓" : "○"}</span><div><strong>Alpha Capstone</strong><p>Um PROJECT que parte da observação e termina em variação autoral.</p></div></article>
        </div>

        <section className="alpha-domains">
          <div className="section-heading"><div><p className="eyebrow">Mastery Gate</p><h2>Evidence por domínio</h2></div></div>
          <div className="alpha-domain-grid">
            {snapshot.domains.map((domain) => (
              <Link href={domain.href} className="alpha-domain" key={domain.skillKey}>
                <div><strong>{domain.domain}</strong><span>{domain.masteryLevel ?? "SEM EVIDÊNCIA"}</span></div>
                <b>{domain.masteryScore == null ? "—" : `${Math.round(domain.masteryScore * 100)}%`}</b>
                <small>{domain.evidenceCount} evidência(s)</small>
              </Link>
            ))}
          </div>
        </section>

        <aside className="alpha-next-action">
          <p className="eyebrow">Faça agora</p>
          <h2>{snapshot.nextAction.title}</h2>
          <p>{snapshot.nextAction.description}</p>
          <Link className="primary link-button" href={snapshot.nextAction.href}>Ir para próxima ação</Link>
        </aside>

        <section className="alpha-capstone-brief">
          <p className="eyebrow">Alpha Capstone · Build It</p>
          <h2>Observe uma coisa real. Depois transforme.</h2>
          <ol><li>Escolha um objeto simples.</li><li>Mapeie proporção e shapes principais.</li><li>Construa o volume com forms.</li><li>Corrija eixo e orientação.</li><li>Crie uma variação própria do mesmo objeto.</li></ol>
          <p>Registre o resultado em <strong>Create</strong> como tipo <strong>PROJECT</strong>. Para o Before/After, registre outro estudo com o título exato <strong>Drawing Zero Revisited</strong>.</p>
        </section>

        <AlphaGateButton ready={ready} />
        <div className="flow-actions split-actions"><Link className="secondary link-button" href="/">Home</Link><Link className="secondary link-button" href="/journey">Journey</Link></div>
      </section>
    </main>
  );
}
