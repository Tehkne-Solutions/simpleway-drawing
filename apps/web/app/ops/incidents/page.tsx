import Link from "next/link";
import { redirect } from "next/navigation";
import { evaluateLaunchIncidents } from "../../../server/launch-incidents";
import { getClosedAlphaFeedbackRepository, getOperationsRepository } from "../../../server/runtime";
import { hasOpsSession } from "../../../server/ops-session";

export const dynamic = "force-dynamic";

export default async function LaunchIncidentsPage() {
  if (!(await hasOpsSession())) redirect("/ops/login");

  const [feedback, interventions] = await Promise.all([
    getClosedAlphaFeedbackRepository().listAllRecent(100),
    getOperationsRepository().getInterventionQueue(100),
  ]);
  const summary = evaluateLaunchIncidents({ feedback, interventions });

  return (
    <main className="flow-shell">
      <section className="flow-card" style={{ maxWidth: 980, margin: "32px auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <p className="eyebrow">SimpleWay Drawing · Closed Alpha</p>
            <h1 className="flow-title">Launch Incident Console</h1>
            <p className="lead compact">Stop-the-line determinístico baseado somente em feedback crítico e sinais de intervenção já existentes.</p>
          </div>
          <Link className="secondary" href="/ops">Voltar ao Control Center</Link>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 28 }}>
          <article className="card" style={{ minHeight: 120 }}><p className="eyebrow">Decisão</p><strong style={{ fontSize: 32 }}>{summary.decision}</strong></article>
          <article className="card" style={{ minHeight: 120 }}><p className="eyebrow">P0</p><strong style={{ fontSize: 32 }}>{summary.counts.P0}</strong></article>
          <article className="card" style={{ minHeight: 120 }}><p className="eyebrow">P1</p><strong style={{ fontSize: 32 }}>{summary.counts.P1}</strong></article>
          <article className="card" style={{ minHeight: 120 }}><p className="eyebrow">P2</p><strong style={{ fontSize: 32 }}>{summary.counts.P2}</strong></article>
        </section>

        <section className="card" style={{ minHeight: 0, marginTop: 20 }}>
          <p className="eyebrow">Regra operacional</p>
          <p><strong>{summary.reasons.join(" · ")}</strong></p>
          <p style={{ marginBottom: 0 }}>{summary.nextAction}</p>
        </section>

        <section style={{ marginTop: 28 }}>
          <p className="eyebrow">Incidentes derivados</p>
          <h2 style={{ marginTop: 6 }}>O que precisa de atenção</h2>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {summary.incidents.length === 0 ? <p>Nenhum incidente de lançamento detectado.</p> : summary.incidents.map((incident) => (
              <article className="card" key={incident.id} style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{incident.severity} · {incident.title}</strong>
                  <small>{incident.source}</small>
                </div>
                <p>{incident.detail}</p>
                <small>{incident.userId ? `tester ${incident.userId.slice(0, 8)}` : "incidente agregado"}{incident.createdAt ? ` · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(incident.createdAt)}` : ""}</small>
              </article>
            ))}
          </div>
        </section>

        <p style={{ marginTop: 22, opacity: .7, fontSize: 13 }}>P0/P1 interrompem expansão da cohort. P2 exige observação, mas não bloqueia sozinho. Nenhuma classificação usa score comportamental oculto. · Tehkné Solutions</p>
      </section>
    </main>
  );
}
