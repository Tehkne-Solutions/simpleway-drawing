import Link from "next/link";
import { redirect } from "next/navigation";
import { getActivationRepository } from "../../server/runtime";
import { getSessionUserId } from "../../server/session";
import "./resume.css";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/onboarding");

  const activation = await getActivationRepository().getSnapshot(userId);
  const progressPercent = Math.round(activation.progress * 100);

  return (
    <main className="flow-shell">
      <section className="flow-card resume-card">
        <p className="eyebrow">Sua continuidade</p>
        <h1 className="flow-title">Continue exatamente de onde parou.</h1>
        <p className="lead compact">O SimpleWay Drawing usa seu estado real — não uma sequência salva no navegador — para decidir sua próxima ação.</p>

        <div className="learning-progress" aria-label={`Ativação ${progressPercent}% concluída`}>
          <div className="learning-progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
          <strong>{progressPercent}%</strong>
        </div>

        <div className="resume-steps">
          {activation.steps.map((step, index) => (
            <article className={`resume-step ${step.complete ? "is-complete" : ""}`} key={step.key}>
              <span className="lesson-index">{step.complete ? "✓" : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.complete ? "Concluído" : step.key === activation.stage ? "Agora" : "Pendente"}</small>
              </div>
            </article>
          ))}
        </div>

        <section className="home-next-card resume-next">
          <div>
            <p className="eyebrow">HNK · Próxima ação</p>
            <h2>{activation.nextAction.title}</h2>
            <p>{activation.nextAction.description}</p>
          </div>
          <Link className="primary link-button" href={activation.nextAction.href}>Continuar agora</Link>
        </section>

        <p className="resume-meta">Etapa atual: <strong>{activation.stage}</strong> · {activation.completedSteps}/{activation.totalSteps} marcos de ativação.</p>
      </section>
    </main>
  );
}
