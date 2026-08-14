import Link from "next/link";
import { getAlphaRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import { AlphaGateButton } from "./alpha-client";
import "./alpha-v18.css";

export const dynamic = "force-dynamic";

const statusLabel = {
  NOT_READY: "Rito incompleto",
  SUPPORT_REQUIRED: "Reforço necessário",
  READY_WITH_REVIEW: "Selo disponível com revisão",
  READY: "Selo disponível",
} as const;

export default async function AlphaPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    return <main className="flow-shell"><section className="flow-card"><p className="eyebrow">Foundation Alpha</p><h1 className="flow-title">O rito começa depois da primeira Evidence.</h1><p className="lead compact">Entre na campanha para construir as habilidades que abrirão o selo de integração.</p><div className="flow-actions"><Link className="primary link-button" href="/learn">Entrar na campanha</Link></div></section></main>;
  }

  const snapshot = await getAlphaRepository().getSnapshot(userId);
  const ready = snapshot.status === "READY" || snapshot.status === "READY_WITH_REVIEW";

  return (
    <main className="alpha-rite-shell">
      <header className="alpha-rite-command">
        <div>
          <p className="eyebrow">Sociedade Croma · Rito de Integração Alpha</p>
          <h1>Três provas transformam fundamento em passagem.</h1>
          <p>O Alpha não mede presença. Ele exige que currículo, comparação e criação conversem com Evidence real antes de abrir o mundo seguinte.</p>
        </div>
        <aside className="alpha-rite-status">
          <span>ESTADO DO SELO</span>
          <strong>{statusLabel[snapshot.status]}</strong>
          <small>{ready ? "As provas autoritativas permitem registrar a passagem." : "Croma mantém o selo fechado até as provas responderem."}</small>
        </aside>
      </header>

      <section className="alpha-rite-board" aria-label="Mapa do Rito Alpha">
        <div className="alpha-rite-lines" aria-hidden="true" />

        <article className={`alpha-trial trial-foundation ${snapshot.c4Completed ? "is-complete" : ""}`}>
          <span>PROVA I · RAIZ</span>
          <div className="alpha-trial-mark">{snapshot.c4Completed ? "✓" : "I"}</div>
          <strong>Foundation C0–C4</strong>
          <p>Demonstre o caminho completo: observar, controlar, simplificar e construir em volume.</p>
          <Link href="/learn">{snapshot.c4Completed ? "Revisitar campanha →" : "Continuar campanha →"}</Link>
        </article>

        <article className={`alpha-trial trial-mirror ${snapshot.hasDrawingZeroRevisit ? "is-complete" : ""}`}>
          <span>PROVA II · ESPELHO</span>
          <div className="alpha-trial-mark">{snapshot.hasDrawingZeroRevisit ? "✓" : "II"}</div>
          <strong>Drawing Zero Revisited</strong>
          <p>Retorne ao mesmo ponto de partida e permita que processo, proporção e volume mostrem o que mudou.</p>
          <Link href="/create?mode=revisit#registro-externo">{snapshot.hasDrawingZeroRevisit ? "Abrir registro →" : "Entrar na Prova do Espelho →"}</Link>
        </article>

        <article className={`alpha-trial trial-work ${snapshot.hasCapstone ? "is-complete" : ""}`}>
          <span>PROVA III · OBRA</span>
          <div className="alpha-trial-mark">{snapshot.hasCapstone ? "✓" : "III"}</div>
          <strong>Alpha Capstone · Build It</strong>
          <p>Observe algo real, construa sua estrutura e então produza uma variação que já não seja mera cópia.</p>
          <Link href="/create?mode=capstone#registro-externo">{snapshot.hasCapstone ? "Abrir Capstone →" : "Entrar na Prova da Obra →"}</Link>
        </article>

        <div className="alpha-rite-center">
          <span aria-hidden="true">✦</span>
          <small>SELO ALPHA</small>
          <strong>{ready ? "A passagem respondeu." : "A passagem observa."}</strong>
          <p>{ready ? "Registre o rito e permita que a Bússola de Croma abra os territórios criativos." : "Complete as provas e fortaleça as runas que ainda não sustentam o conjunto."}</p>
          <AlphaGateButton ready={ready} />
        </div>
      </section>

      <section className="alpha-runes" aria-label="Runas de domínio do Alpha">
        {snapshot.domains.map((domain) => (
          <Link href={domain.href} className={`alpha-rune ${domain.evidenceCount > 0 ? "" : "is-empty"}`} key={domain.skillKey}>
            <span>RUNA · {domain.domain.toUpperCase()}</span>
            <strong>{domain.domain}</strong>
            <b>{domain.masteryScore == null ? "—" : `${Math.round(domain.masteryScore * 100)}%`}</b>
            <small>{domain.masteryLevel ?? "SEM EVIDÊNCIA"} · {domain.evidenceCount} Evidence</small>
          </Link>
        ))}
      </section>

      <aside className="alpha-rite-croma">
        <span>CROMA · PRÓXIMO MOVIMENTO</span>
        <div><strong>{snapshot.nextAction.title}</strong><p>{snapshot.nextAction.description}</p></div>
        <Link href={snapshot.nextAction.href}>Seguir a indicação →</Link>
      </aside>

      <footer className="alpha-rite-actions">
        <Link className="secondary link-button" href="/">Hub</Link>
        <div><Link className="secondary link-button" href="/skills">Runas detalhadas</Link><Link className="primary link-button" href="/journey">Atlas do Olhar</Link></div>
      </footer>
    </main>
  );
}
