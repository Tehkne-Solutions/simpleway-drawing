import Link from "next/link";
import { getClosedAlphaRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";

export const dynamic = "force-dynamic";

function shortCycle(key: string): string {
  return key.split(".").at(-1)?.toUpperCase() ?? key;
}

export default async function DiagnosticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    return (
      <main className="flow-shell">
        <section className="flow-card">
          <p className="eyebrow">Closed Alpha Diagnostics</p>
          <h1 className="flow-title">Ainda não existe uma sessão de participante.</h1>
          <p className="lead compact">Inicie o fluxo pelo Drawing Zero ou por um Lab para criar a sessão guest do Alpha.</p>
          <div className="flow-actions"><Link className="primary link-button" href="/drawing-zero">Iniciar Drawing Zero</Link></div>
        </section>
      </main>
    );
  }

  const diagnostics = await getClosedAlphaRepository().getDiagnostics(userId);
  return (
    <main className="flow-shell">
      <section className="flow-card diagnostics-card">
        <div className="diagnostics-head">
          <div><p className="eyebrow">Closed Alpha Diagnostics</p><h1 className="flow-title">Estado operacional do participante.</h1><p className="lead compact">Use esta tela para identificar rapidamente onde o fluxo parou sem expor conteúdo privado da arte.</p></div>
          <span className="diagnostics-stage">{diagnostics.activationStage.replaceAll("_", " ")}</span>
        </div>

        <section className="diagnostics-grid" aria-label="Indicadores do participante">
          <article><span>Artworks</span><strong>{diagnostics.artworkCount}</strong><small>{diagnostics.baselineCount} baseline</small></article>
          <article><span>Skills</span><strong>{diagnostics.skillCount}</strong><small>{diagnostics.evidenceCount} evidências</small></article>
          <article><span>Journey</span><strong>{diagnostics.journeyCount}</strong><small>marcos persistidos</small></article>
          <article><span>Alpha Gate</span><strong className="diagnostics-status">{diagnostics.alphaStatus}</strong><small>estado atual</small></article>
        </section>

        <section className="diagnostics-cycles">
          <p className="eyebrow">Foundation</p>
          <div>{diagnostics.cycles.map((cycle) => <article key={cycle.key}><strong>{shortCycle(cycle.key)}</strong><span>{cycle.status}</span></article>)}</div>
        </section>

        <section className="alpha-next-action">
          <p className="eyebrow">Próxima ação recomendada</p>
          <h2>{diagnostics.nextAction.title}</h2>
          <p>{diagnostics.nextAction.description}</p>
          <Link className="primary link-button" href={diagnostics.nextAction.href}>Abrir etapa</Link>
        </section>

        <section className="diagnostics-links">
          <a href="/api/health" target="_blank" rel="noreferrer">Liveness</a>
          <a href="/api/ready" target="_blank" rel="noreferrer">Readiness</a>
          <Link href="/alpha">Alpha Gate</Link>
          <Link href="/journey">Journey</Link>
        </section>
      </section>
    </main>
  );
}
