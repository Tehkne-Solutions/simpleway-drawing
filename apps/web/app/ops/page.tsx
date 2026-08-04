import Link from "next/link";
import { redirect } from "next/navigation";
import { evaluateCohortReadiness } from "../../server/cohort-readiness";
import { getClosedAlphaFeedbackRepository, getCohortAnalyticsRepository, getOperationsRepository } from "../../server/runtime";
import { hasOpsSession } from "../../server/ops-session";
import { InviteManager } from "./InviteManager";
import { OpsLogoutButton } from "./OpsLogoutButton";

export const dynamic = "force-dynamic";

const stageOrder = ["ONBOARDING", "DRAWING_ZERO", "FIRST_LESSON", "FIRST_PRACTICE", "FOUNDATION", "ALPHA_GATE", "COMPLETE"];

export default async function OpsPage() {
  if (!(await hasOpsSession())) redirect("/ops/login");

  const [overview, feedback, cohorts, interventions] = await Promise.all([
    getOperationsRepository().getOverview(),
    getClosedAlphaFeedbackRepository().listAllRecent(20),
    getCohortAnalyticsRepository().list(50),
    getOperationsRepository().getInterventionQueue(50),
  ]);
  const cohortReadiness = cohorts.map((cohort) => ({ cohort, readiness: evaluateCohortReadiness(cohort) }));
  const launchReady = cohortReadiness.filter((item) => item.readiness.state === "READY").length;
  const launchHold = cohortReadiness.filter((item) => item.readiness.state === "HOLD").length;
  const launchWatch = cohortReadiness.filter((item) => item.readiness.state === "WATCH").length;

  const onboardingRate = overview.totalTesters > 0 ? Math.round((overview.onboardedTesters / overview.totalTesters) * 100) : 0;
  const activeRate = overview.trackedTesters > 0 ? Math.round((overview.active24h / overview.trackedTesters) * 100) : 0;
  const averageRating = feedback.length > 0 ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : "—";

  return (
    <main className="flow-shell">
      <section className="flow-card" style={{ maxWidth: 1180, margin: "32px auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">SimpleWay Drawing · Closed Alpha</p>
            <h1 className="flow-title">Control Center</h1>
            <p className="lead compact">Visão operacional do funil, cohorts, atividade, suporte e feedback dos testers.</p>
          </div>
          <OpsLogoutButton />
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 28 }}>
          {[["Testers", overview.totalTesters], ["Onboarded", `${overview.onboardedTesters} · ${onboardingRate}%`], ["Rastreados", overview.trackedTesters], ["Ativos 24h", `${overview.active24h} · ${activeRate}%`], ["Precisam atenção", interventions.length], ["Nota média", averageRating]].map(([label, value]) => <article className="card" key={label} style={{ minHeight: 128 }}><p className="eyebrow">{label}</p><strong style={{ fontSize: 32 }}>{value}</strong></article>)}
        </section>

        <section style={{ marginTop: 36 }}>
          <p className="eyebrow">Launch readiness</p>
          <h2 style={{ marginTop: 6 }}>Go / watch / hold por cohort</h2>
          <p className="lead compact">Estado calculado somente por capacidade, onboarding, atividade 7d e conclusão. Cada decisão mostra o motivo e a próxima ação.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            <article className="card" style={{ minHeight: 112 }}><p className="eyebrow">READY</p><strong style={{ fontSize: 28 }}>{launchReady}</strong><p>Podem avançar.</p></article>
            <article className="card" style={{ minHeight: 112 }}><p className="eyebrow">WATCH</p><strong style={{ fontSize: 28 }}>{launchWatch}</strong><p>Manter e observar.</p></article>
            <article className="card" style={{ minHeight: 112 }}><p className="eyebrow">HOLD</p><strong style={{ fontSize: 28 }}>{launchHold}</strong><p>Não ampliar agora.</p></article>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {cohortReadiness.length === 0 ? <p>Nenhuma cohort criada ainda.</p> : cohortReadiness.map(({ cohort, readiness }) => (
              <article className="card" key={cohort.inviteId} style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div><p className="eyebrow">{readiness.state} · {readiness.phase}</p><strong>{cohort.label}</strong><p style={{ margin: "6px 0 0" }}>{readiness.reasons.join(" · ")}</p></div>
                  <strong>{readiness.remainingCapacity} vaga(s) restante(s)</strong>
                </div>
                <p style={{ marginBottom: 0 }}><strong>Próxima ação:</strong> {readiness.nextAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 36 }}><p className="eyebrow">Intervention queue</p><h2 style={{ marginTop: 6 }}>Testers que podem precisar de suporte</h2><p className="lead compact">Sinais explicáveis baseados em progresso, inatividade e feedback. Nenhum score comportamental oculto.</p><div style={{ display: "grid", gap: 10, marginTop: 16 }}>{interventions.length === 0 ? <p>Nenhum tester exige atenção agora.</p> : interventions.map((item) => <article className="card" key={item.userId} style={{ minHeight: 0, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}><div><p className="eyebrow">{item.priority} · {item.cohortLabel ?? "Sem cohort"}</p><strong>{item.displayName ?? `Tester ${item.userId.slice(0, 8)}`}</strong><p style={{ margin: "6px 0 0" }}>{item.reasons.join(" · ")} · etapa {item.stage ?? "não iniciada"}</p></div><Link className="secondary" href={`/ops/testers/${item.userId}`}>Ver tester</Link></article>)}</div></section>

        <InviteManager />

        <section style={{ marginTop: 36 }}><p className="eyebrow">Cohort analytics</p><h2 style={{ marginTop: 6 }}>Convite → ativação → prática → conclusão</h2><div style={{ overflowX: "auto", marginTop: 16 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}><thead><tr><th align="left">Cohort</th><th align="left">Readiness</th><th align="right">Entraram</th><th align="right">Onboarding</th><th align="right">Ativos 7d</th><th align="right">Evidence</th><th align="right">Concluíram</th><th align="right">Feedback</th><th align="right">Nota</th></tr></thead><tbody>{cohorts.length === 0 ? <tr><td colSpan={9} style={{ padding: "18px 0" }}>Nenhuma cohort criada ainda.</td></tr> : cohortReadiness.map(({ cohort, readiness }) => <tr key={cohort.inviteId}><td style={{ padding: "12px 0", borderTop: "1px solid #e5e5df" }}><strong>{cohort.label}</strong><br /><small>{cohort.status} · {cohort.inviteCount} convite(s) · capacidade {cohort.maxUses}</small></td><td style={{ borderTop: "1px solid #e5e5df" }}><strong>{readiness.state}</strong><br /><small>{readiness.phase}</small></td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{cohort.redeemed}</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{cohort.onboarded} · {cohort.activationRate}%</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{cohort.active7d}</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{cohort.evidenceUsers}</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{cohort.completed} · {cohort.completionRate}%</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{cohort.feedbackCount}</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{cohort.averageRating ?? "—"}</td></tr>)}</tbody></table></div></section>

        <section style={{ marginTop: 36 }}><p className="eyebrow">Funil de ativação</p><div style={{ display: "grid", gap: 10 }}>{stageOrder.map((stage) => { const count = overview.stages[stage] ?? 0; const width = overview.trackedTesters > 0 ? Math.max(2, Math.round((count / overview.trackedTesters) * 100)) : 2; return <div key={stage}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{stage}</strong><span>{count}</span></div><div className="learning-progress-track"><span style={{ width: `${width}%` }} /></div></div>; })}</div></section>

        <section style={{ marginTop: 36 }}><p className="eyebrow">Atividade recente</p><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}><thead><tr><th align="left">Tester</th><th align="left">Etapa</th><th align="left">Última rota</th><th align="right">Heartbeats</th><th align="right">Última atividade</th></tr></thead><tbody>{overview.recent.map((item) => <tr key={item.userId}><td style={{ padding: "12px 0", borderTop: "1px solid #e5e5df" }}>{item.displayName ?? item.userId.slice(0, 8)}</td><td style={{ borderTop: "1px solid #e5e5df" }}>{item.stage ?? "—"}</td><td style={{ borderTop: "1px solid #e5e5df" }}>{item.path ?? "—"}</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{item.heartbeatCount}</td><td align="right" style={{ borderTop: "1px solid #e5e5df" }}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.lastSeenAt)}</td></tr>)}</tbody></table></div></section>

        <section style={{ marginTop: 36 }}><p className="eyebrow">Feedback recente</p><div style={{ display: "grid", gap: 12 }}>{feedback.length === 0 ? <p>Nenhum feedback recebido ainda.</p> : feedback.map((item) => <article className="card" key={item.id} style={{ minHeight: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>{item.category} · {item.rating}/5</strong><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.createdAt)}</small></div><p>{item.message}</p><small>{item.path ?? "sem rota"} · tester {item.userId?.slice(0, 8) ?? "—"}</small></article>)}</div></section>
      </section>
    </main>
  );
}
