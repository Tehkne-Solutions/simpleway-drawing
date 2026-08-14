import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlayerContinuity } from "../../server/player-continuity";
import { getSessionUserId } from "../../server/session";
import "./resume.css";

export const dynamic = "force-dynamic";

function territoryState(complete: boolean, evidenceCount: number) {
  return complete ? "CONSAGRADO" : evidenceCount > 0 ? "EM CURSO" : "DORMENTE";
}

export default async function ResumePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/onboarding");

  const continuity = await getPlayerContinuity(userId);
  const focusPercent = Math.round(continuity.focusProgress * 100);
  const worldPercent = Math.round(continuity.worldProgress * 100);

  return (
    <main className="continuity-shell">
      <header className="continuity-command">
        <div>
          <p className="eyebrow">Sociedade Croma · Bússola de Continuidade</p>
          <h1>Seu próximo passo deve continuar o que você realmente construiu.</h1>
          <p>{continuity.phaseDescription}</p>
        </div>
        <div className="continuity-world-meter" aria-label={`Mundo ${worldPercent}% explorado`}>
          <span>MUNDO EXPLORADO</span>
          <strong>{worldPercent}%</strong>
          <div><i style={{ width: `${worldPercent}%` }} /></div>
          <small>{continuity.completedMilestones}/{continuity.totalMilestones} marcos autoritativos</small>
        </div>
      </header>

      <section className="continuity-board" aria-label="Bússola de Croma">
        <div className="continuity-compass" aria-hidden="true">
          <span>N</span><span>L</span><span>S</span><span>O</span>
          <b>C</b>
        </div>

        <article className={`continuity-primary phase-${continuity.phase.toLowerCase()}`}>
          <div className="continuity-primary-top">
            <span>ROTA ATIVA · {continuity.phaseTitle}</span>
            <b>{focusPercent}%</b>
          </div>
          <h2>{continuity.nextAction.title}</h2>
          <p>{continuity.nextAction.description}</p>
          <div className="continuity-focus-track"><i style={{ width: `${focusPercent}%` }} /></div>
          <Link href={continuity.nextAction.href}>Continuar agora <span>→</span></Link>
        </article>

        <aside className="continuity-croma">
          <span>CROMA · LEITURA DA ROTA</span>
          <strong>{continuity.phase === "FOUNDATION" ? "Construa a raiz antes de exigir a copa." : continuity.phase === "CREATIVE_WORLD" ? "Não abandone um território que já respondeu." : "Agora combine, em vez de separar."}</strong>
          <p>{continuity.phase === "FOUNDATION" ? "Sua continuidade principal permanece na Foundation. Explorar Studios é permitido, mas a Bússola preserva o fio pedagógico do arco." : continuity.phase === "CREATIVE_WORLD" ? "A Foundation já está demonstrada. A melhor próxima ação é aprofundar um santuário criativo e produzir Evidence própria." : "Os territórios medidos já foram consagrados. A Bússola aponta para uma criação autoral que use as habilidades em conjunto."}</p>
        </aside>
      </section>

      <section className="continuity-territories" aria-labelledby="continuity-territories-title">
        <div className="continuity-section-head">
          <div><p className="eyebrow">Atlas Criativo</p><h2 id="continuity-territories-title">Três territórios, três linguagens.</h2></div>
          <Link href="/journey">Abrir Atlas completo →</Link>
        </div>
        <div className="continuity-territory-grid">
          {continuity.territories.map((territory) => (
            <Link key={territory.key} href={territory.href} className={`continuity-territory territory-${territory.key} ${territory.complete ? "is-complete" : territory.evidenceCount > 0 ? "is-active" : "is-dormant"}`}>
              <div className="continuity-territory-head"><span>{territory.glyph}</span><b>{territoryState(territory.complete, territory.evidenceCount)}</b></div>
              <strong>{territory.title}</strong>
              <small>{territory.discipline}</small>
              <p>{territory.description}</p>
              <div className="territory-progress"><i style={{ width: `${Math.round(territory.progress * 100)}%` }} /></div>
              <footer><span>{territory.completedSteps}/{territory.totalSteps} marcos</span><b>{territory.complete ? territory.reward : territory.evidenceCount > 0 ? "Continuar →" : "Explorar →"}</b></footer>
            </Link>
          ))}
        </div>
      </section>

      <section className="continuity-foundation" aria-label="Selos da Foundation">
        <div><p className="eyebrow">Raiz do Aprendiz</p><h2>Selos de ativação</h2><p>Estes selos sustentam a rota, mas não precisam ocupar o centro da experiência.</p></div>
        <div className="continuity-seals">
          {continuity.activation.steps.map((step, index) => (
            <span key={step.key} className={step.complete ? "is-complete" : step.key === continuity.activation.stage ? "is-current" : ""} title={step.title}>
              <b>{step.complete ? "✓" : index + 1}</b><small>{step.title}</small>
            </span>
          ))}
        </div>
      </section>

      <footer className="continuity-actions">
        <Link className="secondary link-button" href="/">Voltar ao Hub</Link>
        <div><Link className="secondary link-button" href="/journey">Atlas do Olhar</Link><Link className="primary link-button" href="/create">Atelier Livre</Link></div>
      </footer>
    </main>
  );
}
